<?php
// router.php - роутер для PHP dev server в public/

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = urldecode($uri);

// Если запрос к API - отдаём его
if (preg_match('/^\/server\/api\.php/', $uri)) {
    require __DIR__ . '/../server/api.php';
    return true;
}

// Для статических файлов - пусть сервер обрабатывает сам
if (preg_match('/\.(css|js|json|png|jpg|jpeg|gif|ico|svg|mp3|wav|ogg|m4a)$/', $uri)) {
    return false;
}

// Всё остальное - отдаём index.php
require __DIR__ . '/index.php';
return true;
