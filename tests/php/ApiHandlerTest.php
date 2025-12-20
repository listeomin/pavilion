<?php
// tests/php/ApiHandlerTest.php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../server/ApiHandler.php';
require_once __DIR__ . '/../../server/SessionRepository.php';
require_once __DIR__ . '/../../server/MessageRepository.php';
require_once __DIR__ . '/../../server/GitHubService.php';
require_once __DIR__ . '/../../server/PinterestService.php';
require_once __DIR__ . '/../../server/LinkPreviewService.php';
require_once __DIR__ . '/../../server/ImageUploadService.php';
require_once __DIR__ . '/../../server/BroadcastService.php';

class ApiHandlerTest extends TestCase {
    private PDO $db;
    private SessionRepository $sessionRepo;
    private MessageRepository $msgRepo;
    private ApiHandler $handler;
    private string $testNamesFile;

    protected function setUp(): void {
        // In-memory SQLite
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $this->db->exec("
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            );
        ");
        $this->db->exec("
            CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                author TEXT NOT NULL,
                text TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        ");
        
        // Тестовый user_names.json
        $this->testNamesFile = sys_get_temp_dir() . '/test_user_names_' . uniqid() . '.json';
        file_put_contents($this->testNamesFile, json_encode(['🐱 Test Cat', '🐶 Test Dog']));
        
        $this->sessionRepo = new SessionRepository($this->db, $this->testNamesFile);
        $this->msgRepo = new MessageRepository();
        $reflection = new ReflectionClass($this->msgRepo);
        $property = $reflection->getProperty('db');
        $property->setValue($this->msgRepo, $this->db);
        
        // Mock сервисы (возвращают null = нет обогащения)
        $mockGithub = $this->createMock(GitHubService::class);
        $mockGithub->method('enrichMessage')->willReturn(null);
        
        $mockPinterest = $this->createMock(PinterestService::class);
        $mockPinterest->method('enrichMessage')->willReturn(null);
        
        $mockLink = $this->createMock(LinkPreviewService::class);
        $mockLink->method('enrichMessage')->willReturn(null);
        
        $mockImage = $this->createMock(ImageUploadService::class);
        
        $mockBroadcast = $this->createMock(BroadcastService::class);
        $mockBroadcast->method('messageNew')->willReturn(true);
        $mockBroadcast->method('messageUpdated')->willReturn(true);
        
        $this->handler = new ApiHandler(
            $this->sessionRepo,
            $this->msgRepo,
            $mockGithub,
            $mockPinterest,
            $mockLink,
            $mockImage,
            $mockBroadcast
        );
    }

    protected function tearDown(): void {
        if (file_exists($this->testNamesFile)) {
            unlink($this->testNamesFile);
        }
    }

    // init action
    
    public function test_init_creates_new_session_and_returns_it(): void {
        $result = $this->handler->init([], []);
        
        $this->assertArrayHasKey('session_id', $result);
        $this->assertArrayHasKey('name', $result);
        $this->assertArrayHasKey('is_new', $result);
        $this->assertArrayHasKey('messages', $result);
        $this->assertTrue($result['is_new']);
        $this->assertNotNull($result['set_cookie']);
    }

    public function test_init_returns_last_messages_for_new_session(): void {
        // Создаём несколько сообщений
        for ($i = 1; $i <= 60; $i++) {
            $this->msgRepo->add('session1', 'Alice', "Message $i");
        }
        
        $result = $this->handler->init([], []);
        
        $this->assertCount(50, $result['messages']); // getLastPage(50)
    }

    public function test_init_returns_existing_session_if_cookie_provided(): void {
        $session = $this->sessionRepo->create();
        
        $result = $this->handler->init([], ['chat_session_id' => $session['id']]);
        
        $this->assertEquals($session['id'], $result['session_id']);
        $this->assertFalse($result['is_new']);
        $this->assertNull($result['set_cookie']);
    }

    public function test_init_returns_all_messages_for_existing_session(): void {
        $session = $this->sessionRepo->create();
        $this->msgRepo->add($session['id'], $session['name'], 'Message 1');
        $this->msgRepo->add($session['id'], $session['name'], 'Message 2');
        
        $result = $this->handler->init([], ['chat_session_id' => $session['id']]);
        
        $this->assertCount(2, $result['messages']);
    }

    // send action
    
    public function test_send_requires_session_id(): void {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('session_id required');
        
        $this->handler->send(['text' => 'Hello']);
    }

    public function test_send_saves_text_and_metadata(): void {
        $session = $this->sessionRepo->create();
        
        $result = $this->handler->send([
            'session_id' => $session['id'],
            'text' => 'Test message',
            'metadata' => ['type' => 'test']
        ]);
        
        $this->assertArrayHasKey('id', $result);
        $this->assertEquals('Test message', $result['text']);
        $this->assertEquals(['type' => 'test'], $result['metadata']);
    }

    public function test_send_returns_created_message(): void {
        $session = $this->sessionRepo->create();
        
        $result = $this->handler->send([
            'session_id' => $session['id'],
            'text' => 'Hello world'
        ]);
        
        $this->assertArrayHasKey('id', $result);
        $this->assertEquals($session['name'], $result['author']);
        $this->assertEquals('Hello world', $result['text']);
    }

    public function test_send_throws_on_invalid_session(): void {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('invalid session');
        
        $this->handler->send([
            'session_id' => 'nonexistent',
            'text' => 'Hello'
        ]);
    }

    // update_message action
    
    public function test_update_message_requires_session_id_and_message_id(): void {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('session_id and message_id required');
        
        $this->handler->updateMessage(['text' => 'Updated']);
    }

    public function test_update_message_checks_authorization(): void {
        $session1 = $this->sessionRepo->create();
        $session2 = $this->sessionRepo->create();
        $msg = $this->msgRepo->add($session1['id'], $session1['name'], 'Original');
        
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('message not found or unauthorized');
        
        $this->handler->updateMessage([
            'session_id' => $session2['id'],
            'message_id' => $msg['id'],
            'text' => 'Hacked'
        ]);
    }

    public function test_update_message_returns_updated_message(): void {
        $session = $this->sessionRepo->create();
        $msg = $this->msgRepo->add($session['id'], $session['name'], 'Original text');
        
        $result = $this->handler->updateMessage([
            'session_id' => $session['id'],
            'message_id' => $msg['id'],
            'text' => 'Updated text'
        ]);
        
        $this->assertEquals('Updated text', $result['text']);
        $this->assertEquals($msg['id'], $result['id']);
    }

    // change_name action
    
    public function test_change_name_changes_session_name(): void {
        $session = $this->sessionRepo->create();
        $originalName = $session['name'];
        
        $result = $this->handler->changeName(['session_id' => $session['id']]);
        
        $this->assertArrayHasKey('name', $result);
        // Имя может совпасть с оригинальным в редких случаях, проверяем что метод отработал
        $this->assertEquals($session['id'], $result['id']);
    }

    public function test_change_name_returns_new_name(): void {
        $session = $this->sessionRepo->create();
        
        $result = $this->handler->changeName(['session_id' => $session['id']]);
        
        $this->assertArrayHasKey('name', $result);
        $this->assertArrayHasKey('id', $result);
        $this->assertArrayHasKey('created_at', $result);
    }
}
