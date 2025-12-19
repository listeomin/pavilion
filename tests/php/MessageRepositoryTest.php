<?php
// tests/php/MessageRepositoryTest.php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../server/MessageRepository.php';

class MessageRepositoryTest extends TestCase {
    private PDO $db;
    private MessageRepository $repo;

    protected function setUp(): void {
        // In-memory SQLite для изоляции
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Создаём схему
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
        
        // Мокируем get_db() через Reflection
        $this->repo = new MessageRepository();
        $reflection = new ReflectionClass($this->repo);
        $property = $reflection->getProperty('db');
        $property->setAccessible(true);
        $property->setValue($this->repo, $this->db);
    }

    public function test_add_returns_message_with_correct_structure(): void {
        $result = $this->repo->add('session1', 'Alice', 'Hello world');
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('id', $result);
        $this->assertArrayHasKey('session_id', $result);
        $this->assertArrayHasKey('author', $result);
        $this->assertArrayHasKey('text', $result);
        $this->assertArrayHasKey('created_at', $result);
        
        $this->assertEquals('session1', $result['session_id']);
        $this->assertEquals('Alice', $result['author']);
        $this->assertEquals('Hello world', $result['text']);
        $this->assertIsInt($result['id']);
        $this->assertGreaterThan(0, $result['id']);
    }

    public function test_add_saves_metadata_as_json(): void {
        $metadata = [
            'type' => 'music',
            'artist' => 'Test Artist',
            'track' => 'Test Track'
        ];
        
        $result = $this->repo->add('session1', 'Alice', 'Check this out', $metadata);
        
        $this->assertArrayHasKey('metadata', $result);
        $this->assertEquals($metadata, $result['metadata']);
        
        // Проверяем что в БД сохранилось как JSON
        $stmt = $this->db->prepare('SELECT metadata FROM messages WHERE id = :id');
        $stmt->execute([':id' => $result['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $this->assertJson($row['metadata']);
        $this->assertEquals($metadata, json_decode($row['metadata'], true));
    }

    public function test_getAll_returns_all_messages(): void {
        $this->repo->add('session1', 'Alice', 'Message 1');
        $this->repo->add('session2', 'Bob', 'Message 2');
        $this->repo->add('session1', 'Alice', 'Message 3');
        
        $result = $this->repo->getAll();
        
        $this->assertCount(3, $result);
        $this->assertEquals('Message 1', $result[0]['text']);
        $this->assertEquals('Message 2', $result[1]['text']);
        $this->assertEquals('Message 3', $result[2]['text']);
    }

    public function test_getLastPage_returns_specified_number_of_messages(): void {
        for ($i = 1; $i <= 10; $i++) {
            $this->repo->add('session1', 'Alice', "Message $i");
        }
        
        $result = $this->repo->getLastPage(5);
        
        $this->assertCount(5, $result);
        $this->assertEquals('Message 6', $result[0]['text']);
        $this->assertEquals('Message 10', $result[4]['text']);
    }

    public function test_getSinceId_with_null_returns_all_messages(): void {
        $this->repo->add('session1', 'Alice', 'Message 1');
        $this->repo->add('session2', 'Bob', 'Message 2');
        
        $result = $this->repo->getSinceId(null);
        
        $this->assertCount(2, $result);
    }

    public function test_getSinceId_returns_only_messages_after_id(): void {
        $msg1 = $this->repo->add('session1', 'Alice', 'Message 1');
        $msg2 = $this->repo->add('session2', 'Bob', 'Message 2');
        $msg3 = $this->repo->add('session1', 'Alice', 'Message 3');
        $msg4 = $this->repo->add('session2', 'Bob', 'Message 4');
        
        $result = $this->repo->getSinceId($msg2['id']);
        
        $this->assertCount(2, $result);
        $this->assertEquals('Message 3', $result[0]['text']);
        $this->assertEquals('Message 4', $result[1]['text']);
    }

    public function test_getSinceId_sorts_by_id_asc(): void {
        $msg1 = $this->repo->add('session1', 'Alice', 'First');
        $msg2 = $this->repo->add('session2', 'Bob', 'Second');
        $msg3 = $this->repo->add('session1', 'Alice', 'Third');
        
        $result = $this->repo->getSinceId(0);
        
        $this->assertEquals($msg1['id'], $result[0]['id']);
        $this->assertEquals($msg2['id'], $result[1]['id']);
        $this->assertEquals($msg3['id'], $result[2]['id']);
    }

    public function test_update_updates_own_message(): void {
        $msg = $this->repo->add('session1', 'Alice', 'Original text');
        
        $result = $this->repo->update($msg['id'], 'Alice', 'Updated text');
        
        $this->assertNotNull($result);
        $this->assertEquals('Updated text', $result['text']);
        $this->assertEquals($msg['id'], $result['id']);
    }

    public function test_update_returns_null_for_other_author_message(): void {
        $msg = $this->repo->add('session1', 'Alice', 'Alice message');
        
        $result = $this->repo->update($msg['id'], 'Bob', 'Hacked text');
        
        $this->assertNull($result);
        
        // Проверяем что сообщение не изменилось
        $all = $this->repo->getAll();
        $this->assertEquals('Alice message', $all[0]['text']);
    }

    public function test_update_correctly_updates_text_and_metadata(): void {
        $originalMeta = ['type' => 'link', 'url' => 'http://example.com'];
        $msg = $this->repo->add('session1', 'Alice', 'Check this link', $originalMeta);
        
        $newMeta = ['type' => 'music', 'artist' => 'Artist', 'track' => 'Track'];
        $result = $this->repo->update($msg['id'], 'Alice', 'Listen to this', $newMeta);
        
        $this->assertEquals('Listen to this', $result['text']);
        $this->assertEquals($newMeta, $result['metadata']);
    }

    public function test_metadata_correctly_deserialized_when_reading(): void {
        $metadata = [
            'type' => 'github',
            'url' => 'https://github.com/user/repo',
            'stars' => 42
        ];
        
        $this->repo->add('session1', 'Alice', 'Check repo', $metadata);
        
        $all = $this->repo->getAll();
        
        $this->assertArrayHasKey('metadata', $all[0]);
        $this->assertIsArray($all[0]['metadata']);
        $this->assertEquals($metadata, $all[0]['metadata']);
    }

    public function test_message_without_metadata_has_no_metadata_key(): void {
        $this->repo->add('session1', 'Alice', 'Plain text');
        
        $all = $this->repo->getAll();
        
        $this->assertArrayNotHasKey('metadata', $all[0]);
    }
}
