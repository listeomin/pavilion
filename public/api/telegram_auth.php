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

// Early debug logging
$earlyDebug = [
    'session_id' => session_id(),
    'has_telegram_user' => isset($_SESSION['telegram_user']),
    'session_keys' => array_keys($_SESSION)
];
logToFile('[telegram_auth] Early session check', $earlyDebug);

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
    logToFile('[telegram_auth] CHECK - Session data', [
        'has_telegram_user' => isset($_SESSION['telegram_user']),
        'session_data' => $_SESSION['telegram_user'] ?? null,
        'cookie' => $_COOKIE['chat_session_id'] ?? null
    ]);

    if (isset($_SESSION['telegram_user'])) {
        $user_id = $_SESSION['telegram_user']['user_id'] ?? null;

        logToFile('[telegram_auth] CHECK - User ID from session', ['user_id' => $user_id]);

        // Убедимся что sessions.user_id установлен
        if ($user_id) {
            try {
                $chat_db = get_db();
                $chat_session_id = $_COOKIE['chat_session_id'] ?? null;

                if ($chat_session_id) {
                    // Проверяем существует ли сессия
                    $checkStmt = $chat_db->prepare('SELECT user_id, name FROM sessions WHERE id = :session_id');
                    $checkStmt->execute([':session_id' => $chat_session_id]);
                    $sessionData = $checkStmt->fetch(PDO::FETCH_ASSOC);

                    if ($sessionData) {
                        // Сессия существует - проверяем user_id
                        $currentUserId = $sessionData['user_id'];

                        if ($currentUserId === null || $currentUserId === false) {
                            // user_id не установлен - обновляем
                            $stmt = $chat_db->prepare('UPDATE sessions SET user_id = :user_id WHERE id = :session_id');
                            $stmt->execute([
                                ':user_id' => $user_id,
                                ':session_id' => $chat_session_id
                            ]);

                            logToFile('[telegram_auth] CHECK - Updated session with user_id', [
                                'session_id' => $chat_session_id,
                                'user_id' => $user_id,
                                'rows_affected' => $stmt->rowCount()
                            ]);
                        }
                    } else {
                        // Сессия НЕ существует - создаём новую
                        logToFile('[telegram_auth] CHECK - Session not found, creating new one', [
                            'old_session_id' => $chat_session_id
                        ]);

                        // Получаем emoji из профиля или генерируем случайный
                        $emoji = '';
                        $kind = 'существо';

                        // Пытаемся загрузить профиль из animal_profiles
                        $animal_db_path = __DIR__ . '/../data/animal.sqlite';
                        if (file_exists($animal_db_path)) {
                            $animal_db = new SQLite3($animal_db_path);
                            $profileStmt = $animal_db->prepare('SELECT emoji, kind FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
                            $profileStmt->bindValue(':user_id', $user_id, SQLITE3_INTEGER);
                            $profileResult = $profileStmt->execute();
                            $profile = $profileResult->fetchArray(SQLITE3_ASSOC);

                            if ($profile && $profile['emoji']) {
                                $emoji = $profile['emoji'];
                                $kind = $profile['kind'] ?: 'существо';
                            }
                            $animal_db->close();
                        }

                        // Если профиля нет - генерируем случайное имя
                        if (!$emoji) {
                            require_once __DIR__ . '/../../server/RandomName.php';
                            $randomName = RandomName::generateNameV2();
                            $emoji = explode(' ', $randomName)[0];
                            $kind = substr($randomName, strlen($emoji) + 1);
                        }

                        $newName = $emoji . ' ' . $kind;

                        // Создаём новую сессию
                        $newSessionId = bin2hex(random_bytes(16));
                        $insertStmt = $chat_db->prepare('INSERT INTO sessions (id, name, created_at, user_id) VALUES (:id, :name, :created_at, :user_id)');
                        $insertStmt->execute([
                            ':id' => $newSessionId,
                            ':name' => $newName,
                            ':created_at' => date('Y-m-d H:i:s'),
                            ':user_id' => $user_id
                        ]);

                        logToFile('[telegram_auth] CHECK - Created new session', [
                            'new_session_id' => $newSessionId,
                            'name' => $newName,
                            'user_id' => $user_id
                        ]);

                        // НЕ МОЖЕМ установить cookie здесь (headers already sent), но сессия создана в БД
                        // При следующем apiInit() эта сессия будет найдена и использована
                    }
                }
            } catch (Exception $e) {
                logToFile('[telegram_auth] CHECK - ERROR updating session user_id', ['error' => $e->getMessage()]);
            }
        }

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

        // Связываем текущую browser session с user_id в таблице sessions
        try {
            $chat_db = get_db();
            // Получаем chat session ID из куки
            $chat_session_id = $_COOKIE['chat_session_id'] ?? null;

            if ($chat_session_id) {
                // Обновляем user_id для текущей сессии
                $stmt = $chat_db->prepare('UPDATE sessions SET user_id = :user_id WHERE id = :session_id');
                $stmt->execute([
                    ':user_id' => $user['id'],
                    ':session_id' => $chat_session_id
                ]);

                $rowCount = $stmt->rowCount();
                logToFile('[telegram_auth] Updated session with user_id', [
                    'session_id' => $chat_session_id,
                    'user_id' => $user['id'],
                    'rows_affected' => $rowCount
                ]);
            } else {
                logToFile('[telegram_auth] WARNING: No chat_session_id cookie found');
            }
        } catch (Exception $e) {
            logToFile('[telegram_auth] ERROR updating session user_id', ['error' => $e->getMessage()]);
        }

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