<?php
// router.php - роутер для PHP dev server

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = urldecode($uri);

// Если запрос к API - отдаём его
if (preg_match('/^\/server\/api\.php/', $uri)) {
    require __DIR__ . '/server/api.php';
    return true;
}

// Для статических файлов - проверяем существование и отдаём
if (preg_match('/\.(css|js|json|png|jpg|jpeg|gif|ico|svg|mp3|wav|ogg|m4a)$/', $uri)) {
    $file = __DIR__ . '/public' . $uri;
    if (file_exists($file)) {
        return false; // Пусть встроенный сервер обработает
    }
}

// Всё остальное - отдаём index.php
require __DIR__ . '/public/index.php';
return true;
