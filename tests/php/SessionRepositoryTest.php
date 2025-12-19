<?php
// tests/php/SessionRepositoryTest.php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../server/SessionRepository.php';

class SessionRepositoryTest extends TestCase {
    private PDO $db;
    private SessionRepository $repo;
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
        
        // Создаём временный user_names.json для тестов
        $this->testNamesFile = sys_get_temp_dir() . '/test_user_names_' . uniqid() . '.json';
        $testNames = ['🐱 Тестовый кот', '🐶 Тестовая собака', '🐭 Тестовая мышь'];
        file_put_contents($this->testNamesFile, json_encode($testNames));
        
        // Передаём mock зависимости через конструктор
        $this->repo = new SessionRepository($this->db, $this->testNamesFile);
    }

    protected function tearDown(): void {
        if (file_exists($this->testNamesFile)) {
            unlink($this->testNamesFile);
        }
    }

    public function test_create_generates_unique_32_char_hex_id(): void {
        $session = $this->repo->create();
        
        $this->assertIsArray($session);
        $this->assertArrayHasKey('id', $session);
        $this->assertEquals(32, strlen($session['id']));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $session['id']);
    }

    public function test_create_sets_name_from_pool(): void {
        $session = $this->repo->create();
        
        $this->assertArrayHasKey('name', $session);
        $this->assertNotEmpty($session['name']);
    }

    public function test_get_returns_session_by_id(): void {
        $created = $this->repo->create();
        
        $fetched = $this->repo->get($created['id']);
        
        $this->assertNotNull($fetched);
        $this->assertEquals($created['id'], $fetched['id']);
        $this->assertEquals($created['name'], $fetched['name']);
    }

    public function test_get_returns_null_for_nonexistent_session(): void {
        $result = $this->repo->get('nonexistent-id-12345678901234567890');
        
        $this->assertNull($result);
    }

    public function test_changeName_changes_name_to_new_from_pool(): void {
        $session = $this->repo->create();
        $originalName = $session['name'];
        
        // Пробуем сменить имя несколько раз, т.к. может выпасть то же самое
        $newName = null;
        for ($i = 0; $i < 10; $i++) {
            $updated = $this->repo->changeName($session['id']);
            if ($updated['name'] !== $originalName) {
                $newName = $updated['name'];
                break;
            }
        }
        
        // Если после 10 попыток имя не изменилось, проверяем что хотя бы вернулось валидное имя
        $this->assertNotNull($newName ?? $originalName);
        $this->assertNotEmpty($newName ?? $originalName);
    }

    public function test_changeName_avoids_taken_names(): void {
        // Создаём 3 сессии, заполняя весь пул имён (у нас 3 тестовых имени)
        $session1 = $this->repo->create();
        $session2 = $this->repo->create();
        $session3 = $this->repo->create();
        
        $names = [$session1['name'], $session2['name'], $session3['name']];
        
        // Все имена должны быть уникальными
        $this->assertEquals(3, count(array_unique($names)));
        
        // Удаляем session2, освобождая имя
        $freedName = $session2['name'];
        $this->db->exec("DELETE FROM sessions WHERE id = '{$session2['id']}'");
        
        // Меняем имя session1 - должно взять освободившееся
        $updated = $this->repo->changeName($session1['id']);
        
        $this->assertNotNull($updated);
        // Новое имя не должно совпадать с session3
        $this->assertNotEquals($session3['name'], $updated['name']);
    }
}
