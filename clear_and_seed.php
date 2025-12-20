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

// Создаём системную сессию для капитанской рубки
$systemId = bin2hex(random_bytes(16));
$systemName = '🛳️ капитанская рубка';
$now = (new DateTime())->format(DateTime::ATOM);

$stmt = $db->prepare('INSERT OR REPLACE INTO sessions (id, name, created_at) VALUES (:id, :name, :created_at)');
$stmt->execute([
    ':id' => $systemId,
    ':name' => $systemName,
    ':created_at' => $now
]);

// Получаем инфо из git
$gitHash = trim(shell_exec('git rev-parse --short HEAD 2>/dev/null') ?: 'unknown');
$gitDate = trim(shell_exec('git log -1 --pretty=%ci 2>/dev/null') ?: date('Y-m-d H:i:s'));

// Прямые GIF ссылки (отдают .gif файл)
$gifs = [
    'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    'https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif',
    'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    'https://cataas.com/cat/gif',
];

$randomGif = $gifs[array_rand($gifs)];

// Формируем приветственное сообщение
$welcomeText = <<<MD
{$randomGif}

Намасте!
Последнее обновление: {$gitDate}
Версия: {$gitHash}
MD;

// Добавляем системное сообщение
$msgRepo->add($systemId, $systemName, $welcomeText);

echo "✓ База очищена\n";
echo "✓ Системное сообщение от {$systemName} добавлено\n";
echo "✓ Версия: {$gitHash}\n";
