<?php
// public/api/telegram_auth.php - авторизация через Telegram с созданием User
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();

header('Content-Type: application/json');

// Логирование в файл
$logFile = __DIR__ . '/../../logs/telegram_auth.log';
$logDir = dirname($logFile);
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

function logToFile($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] {$message}";
    if ($data !== null) {
        $logEntry .= "\n" . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    $logEntry .= "\n" . str_repeat('-', 80) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

logToFile('[telegram_auth] Request started', [
    'action' => $_GET['action'] ?? 'none',
    'method' => $_SERVER['REQUEST_METHOD']
]);

try {
    logToFile('[telegram_auth] Loading db.php...');
    require_once __DIR__ . '/../../server/db.php';
    logToFile('[telegram_auth] db.php loaded');

    logToFile('[telegram_auth] Loading UserRepository.php...');
    require_once __DIR__ . '/../../server/UserRepository.php';
    logToFile('[telegram_auth] UserRepository.php loaded');
} catch (Exception $e) {
    logToFile('[telegram_auth] ERROR loading dependencies', ['error' => $e->getMessage()]);
    echo json_encode(['success' => false, 'error' => 'Failed to load dependencies: ' . $e->getMessage()]);
    exit;
} catch (Error $e) {
    logToFile('[telegram_auth] FATAL ERROR loading dependencies', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    echo json_encode(['success' => false, 'error' => 'Fatal error: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';
logToFile('[telegram_auth] Action: ' . $action);

try {
    logToFile('[telegram_auth] Creating UserRepository...');
    $userRepo = new UserRepository();
    logToFile('[telegram_auth] UserRepository created');
} catch (Exception $e) {
    logToFile('[telegram_auth] ERROR creating UserRepository', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    echo json_encode(['success' => false, 'error' => 'Failed to create UserRepository: ' . $e->getMessage()]);
    exit;
} catch (Error $e) {
    logToFile('[telegram_auth] FATAL ERROR creating UserRepository', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    echo json_encode(['success' => false, 'error' => 'Fatal error creating UserRepository: ' . $e->getMessage()]);
    exit;
}

if ($action === 'check') {
    if (isset($_SESSION['telegram_user'])) {
        echo json_encode([
            'success' => true,
            'data' => $_SESSION['telegram_user']
        ]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}

if ($action === 'logout') {
    unset($_SESSION['telegram_user']);
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'auth') {
    $rawInput = file_get_contents('php://input');
    logToFile('[telegram_auth] Auth action - raw input', ['raw' => $rawInput]);

    $data = json_decode($rawInput, true);
    logToFile('[telegram_auth] Auth action - decoded data', $data);

    try {
        logToFile('[telegram_auth] Creating/finding user...', [
            'telegram_id' => (int)$data['id'],
            'username' => $data['username'] ?? '',
            'first_name' => $data['first_name'] ?? ''
        ]);

        // Создаем или находим пользователя в таблице users
        $user = $userRepo->findOrCreateByTelegramId(
            (int)$data['id'],
            $data['username'] ?? '',
            $data['first_name'] ?? ''
        );

        logToFile('[telegram_auth] User created/found', $user);

        // Сохраняем данные в PHP сессию (для текущего браузера)
        $_SESSION['telegram_user'] = [
            'user_id' => $user['id'], // ← ВАЖНО: ID пользователя из таблицы users
            'telegram_id' => $user['telegram_id'],
            'telegram_username' => $user['telegram_username'],
            'telegram_first_name' => $user['telegram_first_name'],
            'telegram_photo_url' => $data['photo_url'] ?? ''
        ];

        logToFile('[telegram_auth] Session saved', $_SESSION['telegram_user']);

        echo json_encode([
            'success' => true,
            'data' => $_SESSION['telegram_user']
        ]);

    } catch (Exception $e) {
        logToFile('[telegram_auth] ERROR in auth action', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        error_log('[telegram_auth] Error: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create/find user: ' . $e->getMessage()
        ]);
    }
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid action']);