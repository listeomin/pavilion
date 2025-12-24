<?php
// router.php - роутер для PHP dev server
// Запускать из корня проекта: php -S localhost:8000 router.php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = urldecode($uri);

// Телеграм логи
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($uri, '/telegram') !== false) {
    file_put_contents(__DIR__ . '/telegram_log.txt', date('Y-m-d H:i:s') . "\n" .
        'URI: ' . $uri . "\n" .
        'TOKEN: ' . substr(getenv('TELEGRAM_BOT_TOKEN'), 0, 20) . "..." . "\n" .
        'POST: ' . print_r($_POST, true) . "\n" .
        'GET: ' . print_r($_GET, true) . "\n\n", FILE_APPEND);
}

// Если запрос к /server/api.php - отдаём его
if (preg_match('/^\/server\/api\.php/', $uri)) {
    require __DIR__ . '/server/api.php';
    return true;
}

// Если запрос к /api/*.php - отдаём соответствующий файл
if (preg_match('/^\/api\/([a-z_]+\.php)/', $uri, $matches)) {
    $file = __DIR__ . '/public/api/' . $matches[1];
    if (file_exists($file)) {
        require $file;
        return true;
    }
}

// Для статических файлов - проверяем существование и отдаём
if (preg_match('/\.(css|js|json|png|jpg|jpeg|gif|ico|svg|mp3|wav|ogg|m4a)$/', $uri)) {
    $file = __DIR__ . '/public' . $uri;
    if (file_exists($file)) {
        // Возвращаем файл напрямую с правильным MIME-типом
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $mimeTypes = [
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
            'svg' => 'image/svg+xml',
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'm4a' => 'audio/mp4'
        ];
        
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
        }
        
        readfile($file);
        return true;
    }
}

// Маршруты страниц
if (preg_match('/^\/nest/', $uri)) {
    require __DIR__ . '/public/nest.php';
    return true;
}

if (preg_match('/^\/messages/', $uri)) {
    require __DIR__ . '/public/messages.php';
    return true;
}

if (preg_match('/^\/branches/', $uri)) {
    require __DIR__ . '/public/branches.php';
    return true;
}

// Всё остальное - отдаём index.php
require __DIR__ . '/public/index.php';
return true;
