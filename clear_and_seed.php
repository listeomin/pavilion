<?php
require_once __DIR__ . '/server/db.php';
require_once __DIR__ . '/server/SessionRepository.php';
require_once __DIR__ . '/server/MessageRepository.php';

$db = get_db();
$sessionRepo = new SessionRepository();
$msgRepo = new MessageRepository();

// Очистка
$db->exec('DELETE FROM messages');
$db->exec('DELETE FROM sessions');

// Тестовое сообщение
$id = bin2hex(random_bytes(16));
$now = (new DateTime())->format(DateTime::ATOM);
$name = '🦊 лисус';
$text = 'Делаем inline ввод команд';

$stmt = $db->prepare('INSERT OR REPLACE INTO sessions (id, name, created_at) VALUES (:id, :name, :created_at)');
$stmt->execute([
    ':id' => $id,
    ':name' => $name,
    ':created_at' => $now
]);

$msgRepo->add($id, $name, $text);

echo "База очищена. Добавлено тестовое сообщение от $name\n";
