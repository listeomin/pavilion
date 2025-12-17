<?php
// server/api.php
ini_set('display_errors', 0);  // временно
ini_set('log_errors', 1);
ini_set('error_log', __DIR__.'/php-error.log');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

require_once __DIR__ . '/SessionRepository.php';
require_once __DIR__ . '/MessageRepository.php';
require_once __DIR__ . '/GitHubService.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$sessionRepo = new SessionRepository();
$msgRepo = new MessageRepository();
$githubService = new GitHubService();

error_log('REQUEST: ' . print_r($_REQUEST, true));
error_log('COOKIE: ' . print_r($_COOKIE, true));
error_log('HEADERS: ' . json_encode(getallheaders()));

function json($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$action) {
    http_response_code(400);
    json(['error' => 'action required']);
}

if ($action === 'init') {
    // read cookie if provided
    $cookieId = $_POST['session_id'] ?? $_COOKIE['chat_session_id'] ?? null;
    $session = null;
    $isNew = false;

    if ($cookieId) {
        $session = $sessionRepo->get($cookieId);
    }

    if ($session) {
        // existing session -> return full history
        $messages = $msgRepo->getAll();
        $isNew = false;
    } else {
        // create new session
        $session = $sessionRepo->create();
        $messages = $msgRepo->getLastPage(50);
        $isNew = true;
        // set cookie for future visits (30 days)
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

    // Priority: client metadata (music commands) > GitHub enrichment
    $metadata = $clientMetadata;
    if (!$metadata) {
        $metadata = $githubService->enrichMessage($text);
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

// unknown action
http_response_code(400);
json(['error' => 'unknown action']);
