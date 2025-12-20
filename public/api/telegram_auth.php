<?php
// public/api/telegram_auth.php
require_once __DIR__ . '/../../server/db.php';

// Load .env file
$envPath = __DIR__ . '/../../.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

header('Content-Type: application/json');

session_start();

$action = $_GET['action'] ?? 'auth';

try {
    switch ($action) {
        case 'auth':
            handleAuth();
            break;
        case 'check':
            handleCheck();
            break;
        case 'logout':
            handleLogout();
            break;
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function handleAuth() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        throw new Exception('Invalid auth data');
    }
    
    // Проверка подписи Telegram
    $botToken = getenv('TELEGRAM_BOT_TOKEN');
    if (!$botToken) {
        throw new Exception('Bot token not configured');
    }
    
    $checkHash = $input['hash'];
    unset($input['hash']);
    
    $dataCheckArr = [];
    foreach ($input as $key => $value) {
        $dataCheckArr[] = $key . '=' . $value;
    }
    sort($dataCheckArr);
    
    $dataCheckString = implode("\n", $dataCheckArr);
    $secretKey = hash('sha256', $botToken, true);
    $hash = hash_hmac('sha256', $dataCheckString, $secretKey);
    
    if ($hash !== $checkHash) {
        throw new Exception('Invalid hash');
    }
    
    // Проверка времени (не старше 1 дня)
    if ((time() - $input['auth_date']) > 86400) {
        throw new Exception('Auth data expired');
    }
    
    // Сохраняем в сессию
    $_SESSION['telegram_id'] = $input['id'];
    $_SESSION['telegram_username'] = $input['username'] ?? null;
    $_SESSION['telegram_first_name'] = $input['first_name'] ?? null;
    $_SESSION['telegram_last_name'] = $input['last_name'] ?? null;
    $_SESSION['telegram_photo_url'] = $input['photo_url'] ?? null;
    
    // Обновляем БД если есть session_id
    if (isset($_SESSION['session_id'])) {
        $pdo = get_db();
        $stmt = $pdo->prepare('
            UPDATE sessions 
            SET telegram_id = :telegram_id,
                telegram_username = :telegram_username
            WHERE id = :session_id
        ');
        $stmt->execute([
            'telegram_id' => $input['id'],
            'telegram_username' => $input['username'] ?? null,
            'session_id' => $_SESSION['session_id']
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'telegram_id' => $input['id'],
            'telegram_username' => $input['username'] ?? null,
            'telegram_first_name' => $input['first_name'] ?? null,
            'telegram_last_name' => $input['last_name'] ?? null,
        ]
    ]);
}

function handleCheck() {
    if (isset($_SESSION['telegram_id'])) {
        echo json_encode([
            'success' => true,
            'data' => [
                'telegram_id' => $_SESSION['telegram_id'],
                'telegram_username' => $_SESSION['telegram_username'] ?? null,
                'telegram_first_name' => $_SESSION['telegram_first_name'] ?? null,
                'telegram_last_name' => $_SESSION['telegram_last_name'] ?? null,
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false
        ]);
    }
}

function handleLogout() {
    // Очищаем Telegram данные из сессии
    unset($_SESSION['telegram_id']);
    unset($_SESSION['telegram_username']);
    unset($_SESSION['telegram_first_name']);
    unset($_SESSION['telegram_last_name']);
    unset($_SESSION['telegram_photo_url']);
    
    // Очищаем из БД
    if (isset($_SESSION['session_id'])) {
        $pdo = get_db();
        $stmt = $pdo->prepare('
            UPDATE sessions 
            SET telegram_id = NULL,
                telegram_username = NULL
            WHERE id = :session_id
        ');
        $stmt->execute(['session_id' => $_SESSION['session_id']]);
    }
    
    echo json_encode(['success' => true]);
}
