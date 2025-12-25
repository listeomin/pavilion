<?php
require_once __DIR__ . '/server/db.php';
require_once __DIR__ . '/server/SessionRepository.php';
require_once __DIR__ . '/server/MessageRepository.php';

$db = get_db();
$sessionRepo = new SessionRepository();
$msgRepo = new MessageRepository();

// Устанавливаем московское время
date_default_timezone_set('Europe/Moscow');

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

// Читаем версию из version.json
$versionFile = __DIR__ . '/public/js/version.json';
$version = '0.0.0'; // fallback

if (file_exists($versionFile)) {
    $versionData = json_decode(file_get_contents($versionFile), true);
    if ($versionData && isset($versionData['version'])) {
        $version = $versionData['version'];
    }
}

// Форматируем текущее время создания базы
function formatRussianDate($dateStr) {
    $months = [
        1 => 'января', 2 => 'февраля', 3 => 'марта', 4 => 'апреля',
        5 => 'мая', 6 => 'июня', 7 => 'июля', 8 => 'августа',
        9 => 'сентября', 10 => 'октября', 11 => 'ноября', 12 => 'декабря'
    ];
    
    try {
        $dt = new DateTime($dateStr);
        $day = $dt->format('j');
        $month = $months[(int)$dt->format('n')];
        $year = $dt->format('Y');
        $time = $dt->format('H:i:s');
        return "{$day} {$month} {$year} в {$time} (по Москве)";
    } catch (Exception $e) {
        return $dateStr;
    }
}

// Используем текущее время (момент создания базы)
$formattedDate = formatRussianDate($now);

// Формируем приветственное сообщение
$welcomeText = <<<MD
Жизнь с чистого листа 🍃
Последнее обновление {$formattedDate}
Версия {$version}
MD;

// Добавляем системное сообщение
$msgRepo->add($systemId, $systemName, $welcomeText);

echo "✓ База очищена\n";
echo "✓ Системное сообщение от {$systemName} добавлено\n";
echo "✓ Версия: {$version}\n";
