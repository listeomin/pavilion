<?php
// server/api.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__.'/php-error.log');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/SessionRepository.php';
require_once __DIR__ . '/MessageRepository.php';
require_once __DIR__ . '/GitHubService.php';
require_once __DIR__ . '/PinterestService.php';
require_once __DIR__ . '/LinkPreviewService.php';
require_once __DIR__ . '/ImageUploadService.php';
require_once __DIR__ . '/BroadcastService.php';
require_once __DIR__ . '/ApiHandler.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$handler = new ApiHandler();

function json($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$action) {
    http_response_code(400);
    json(['error' => 'action required']);
}

try {
    if ($action === 'init') {
        $result = $handler->init($_POST, $_COOKIE);
        if (isset($result['set_cookie'])) {
            $cookie = $result['set_cookie'];
            setcookie($cookie['name'], $cookie['value'], [
                'expires' => $cookie['expires'],
                'path' => $cookie['path'],
                'httponly' => $cookie['httponly'],
                'samesite' => $cookie['samesite']
            ]);
            unset($result['set_cookie']);
        }
        json($result);
    }

    if ($action === 'send') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $result = $handler->send($input);
        json($result);
    }

    if ($action === 'change_name') {
        $result = $handler->changeName($_POST);
        json($result);
    }

    if ($action === 'upload_image') {
        $result = $handler->uploadImage($_FILES);
        json($result);
    }

    if ($action === 'delete_image') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $result = $handler->deleteImage($input);
        json($result);
    }

    if ($action === 'update_message') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $result = $handler->updateMessage($input);
        json($result);
    }

    if ($action === 'rebase') {
        $result = $handler->rebase();
        json($result);
    }

    http_response_code(400);
    json(['error' => 'unknown action']);

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    json(['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    http_response_code(403);
    json(['error' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    json(['error' => 'internal server error']);
}
