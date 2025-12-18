<?php
// server/api.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__.'/php-error.log');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

require_once __DIR__ . '/SessionRepository.php';
require_once __DIR__ . '/MessageRepository.php';
require_once __DIR__ . '/GitHubService.php';
require_once __DIR__ . '/PinterestService.php';
require_once __DIR__ . '/LinkPreviewService.php';
require_once __DIR__ . '/ImageUploadService.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$sessionRepo = new SessionRepository();
$msgRepo = new MessageRepository();
$githubService = new GitHubService();
$pinterestService = new PinterestService();
$linkPreviewService = new LinkPreviewService();
$imageService = new ImageUploadService();

function json($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$action) {
    http_response_code(400);
    json(['error' => 'action required']);
}

if ($action === 'init') {
    $cookieId = $_POST['session_id'] ?? $_COOKIE['chat_session_id'] ?? null;
    $session = null;
    $isNew = false;

    if ($cookieId) {
        $session = $sessionRepo->get($cookieId);
    }

    if ($session) {
        $messages = $msgRepo->getAll();
        $isNew = false;
    } else {
        $session = $sessionRepo->create();
        $messages = $msgRepo->getLastPage(50);
        $isNew = true;
        setcookie('chat_session_id', $session['id'], [
            'expires' => time() + 60*60*24*30,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }

    json([
        'session_id' => $session['id'],
        'name' => $session['name'],
        'is_new' => $isNew,
        'messages' => $messages
    ]);
}

if ($action === 'send') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $session_id = $input['session_id'] ?? null;
    $text = trim($input['text'] ?? '');
    $clientMetadata = $input['metadata'] ?? null;

    if (!$session_id || $text === '') {
        http_response_code(400);
        json(['error' => 'session_id and text required']);
    }

    $session = $sessionRepo->get($session_id);
    if (!$session) {
        http_response_code(403);
        json(['error' => 'invalid session']);
    }

    // Priority: client metadata (music) > Pinterest > GitHub > generic link preview
    $metadata = $clientMetadata;
    if (!$metadata) {
        $metadata = $pinterestService->enrichMessage($text);
    }
    if (!$metadata) {
        $metadata = $githubService->enrichMessage($text);
    }
    if (!$metadata) {
        $metadata = $linkPreviewService->enrichMessage($text);
    }

    $message = $msgRepo->add($session_id, $session['name'], $text, $metadata);
    json($message);
}

if ($action === 'poll') {
    $after = isset($_GET['after_id']) && $_GET['after_id'] !== '' ? intval($_GET['after_id']) : null;
    $messages = $msgRepo->getSinceId($after);
    json(['messages' => $messages]);
}

if ($action === 'change_name') {
    $input = $_POST;
    $session_id = $input['session_id'] ?? null;

    if (!$session_id) {
        http_response_code(400);
        json(['error' => 'session_id required']);
    }

    $session = $sessionRepo->changeName($session_id);
    if (!$session) {
        http_response_code(403);
        json(['error' => 'invalid session']);
    }

    json($session);
}

if ($action === 'upload_image') {
    if (!isset($_FILES['image'])) {
        http_response_code(400);
        json(['success' => false, 'error' => 'No image provided']);
    }

    $result = $imageService->upload($_FILES['image']);
    
    if (!$result['success']) {
        http_response_code(400);
    }
    
    json($result);
}

if ($action === 'delete_image') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = $input['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        json(['success' => false, 'error' => 'ID required']);
    }

    $result = $imageService->delete($id);
    
    if (!$result['success']) {
        http_response_code(400);
    }
    
    json($result);
}

http_response_code(400);
json(['error' => 'unknown action']);
