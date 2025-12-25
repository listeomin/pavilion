<?php
ini_set('display_errors', 1); error_reporting(E_ALL);
// api/animal_profile.php
header('Content-Type: application/json');

// Логирование
$logFile = __DIR__ . '/../../logs/animal_profile.log';
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

logToFile('[animal_profile] Request started', [
    'action' => $_GET['action'] ?? 'none',
    'method' => $_SERVER['REQUEST_METHOD']
]);

// Use the centralized DB connection that already knows the correct path
try {
    require_once __DIR__ . '/../../server/db.php';
} catch (Exception $e) {
    logToFile('[animal_profile] ERROR loading db.php', ['error' => $e->getMessage()]);
    echo json_encode(['error' => 'Failed to load db.php: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';
$db_path = __DIR__ . '/../data/animal.sqlite';

logToFile('[animal_profile] Action: ' . $action, ['db_path' => $db_path]);

// Initialize database if not exists
function initDB($db_path) {
    if (!file_exists($db_path)) {
        $db = new SQLite3($db_path);
        $db->exec("
            CREATE TABLE IF NOT EXISTS animal_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                emoji TEXT NOT NULL,
                kind TEXT,
                arial TEXT,
                role TEXT,
                lifecycle TEXT,
                bio TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, emoji)
            )
        ");
        $db->close();
    }
}

initDB($db_path);
error_log('DB path: ' . $db_path . ' | Exists: ' . file_exists($db_path));
$db = new SQLite3($db_path);

switch ($action) {
    case 'get':
        session_start();
        $session_id = $_GET['session_id'] ?? '';
        $emoji = $_GET['emoji'] ?? '';

        logToFile('[animal_profile] GET action', [
            'session_id' => $session_id,
            'emoji' => $emoji
        ]);

        // Сначала ищем по user_id (если пользователь авторизован через Telegram)
        $user_id = $_SESSION['telegram_user']['user_id'] ?? null;

        if ($user_id) {
            // Для авторизованных: ищем ТОЛЬКО по user_id (игнорируем emoji)
            // Один пользователь = один профиль
            $stmt = $db->prepare('SELECT * FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
            $stmt->bindValue(':user_id', $user_id, SQLITE3_INTEGER);
            $result = $stmt->execute();
            $row = $result->fetchArray(SQLITE3_ASSOC);

            logToFile('[animal_profile] GET - Found by user_id', [
                'user_id' => $user_id,
                'found' => (bool)$row,
                'profile' => $row ?: null
            ]);
        } else {
            // Для неавторизованных: ищем по session_id + emoji
            if (!$emoji) {
                echo json_encode(['error' => 'Missing emoji parameter']);
                exit;
            }

            $stmt = $db->prepare('SELECT * FROM animal_profiles WHERE session_id = :session_id AND emoji = :emoji AND user_id IS NULL');
            $stmt->bindValue(':session_id', $session_id, SQLITE3_TEXT);
            $stmt->bindValue(':emoji', $emoji, SQLITE3_TEXT);
            $result = $stmt->execute();
            $row = $result->fetchArray(SQLITE3_ASSOC);

            logToFile('[animal_profile] GET - Found by session_id+emoji', [
                'session_id' => $session_id,
                'emoji' => $emoji,
                'found' => (bool)$row
            ]);
        }

        if ($row) {
            echo json_encode([
                'success' => true,
                'profile' => [
                    'emoji' => $row['emoji'],
                    'kind' => $row['kind'],
                    'arial' => $row['arial'],
                    'role' => $row['role'],
                    'lifecycle' => $row['lifecycle']
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'profile' => null]);
        }
        break;
        
    case 'save':
        session_start();
        $raw_input = file_get_contents('php://input');
        logToFile('[animal_profile] SAVE - Raw input', ['raw' => $raw_input]);

        $input = json_decode($raw_input, true);
        logToFile('[animal_profile] SAVE - Decoded input', $input);

        $session_id = $input['session_id'] ?? '';
        $emoji = $input['emoji'] ?? '';
        $kind = $input['kind'] ?? '';
        $arial = $input['arial'] ?? '';
        $role = $input['role'] ?? '';
        $lifecycle = $input['lifecycle'] ?? '';

        // Получаем user_id из PHP сессии (если пользователь авторизован через Telegram)
        $user_id = $_SESSION['telegram_user']['user_id'] ?? null;

        logToFile('[animal_profile] SAVE - Parsed data', [
            'session_id' => $session_id,
            'user_id' => $user_id,
            'emoji' => $emoji,
            'kind' => $kind,
            'session_data' => $_SESSION['telegram_user'] ?? 'not set'
        ]);

        if (!$emoji || !$kind) {
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }

        // session_id НЕ обязателен для Telegram пользователей (у них есть user_id)
        if (!$user_id && !$session_id) {
            echo json_encode(['error' => 'Missing session_id or user_id']);
            exit;
        }
        
        // Validate kind length (UTF-8 safe)
        $kind_length = function_exists('mb_strlen') ? mb_strlen($kind) : strlen($kind);
        if ($kind_length < 2) {
            echo json_encode(['error' => 'Kind must be at least 2 characters']);
            exit;
        }
        
        // Check for profanity
        $dirty_words_file = __DIR__ . '/../data/dirty.txt';
        if (file_exists($dirty_words_file)) {
            $dirty_words = array_map('trim', file($dirty_words_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
            $kind_lower = function_exists('mb_strtolower') ? mb_strtolower($kind) : strtolower($kind);
            
            foreach ($dirty_words as $word) {
                $word_lower = function_exists('mb_strtolower') ? mb_strtolower($word) : strtolower($word);
                $pos = function_exists('mb_stripos') ? mb_stripos($kind_lower, $word_lower) : stripos($kind_lower, $word_lower);
                if ($pos !== false) {
                    echo json_encode(['error' => 'Profanity detected']);
                    exit;
                }
            }
        }
        
        // Проверяем существует ли профиль
        if ($user_id) {
            // Для авторизованных - ищем ТОЛЬКО по user_id (один пользователь = один профиль)
            $checkStmt = $db->prepare('SELECT id FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
            $checkStmt->bindValue(':user_id', $user_id, SQLITE3_INTEGER);
        } else {
            // Для неавторизованных - ищем по session_id + emoji
            $checkStmt = $db->prepare('SELECT id FROM animal_profiles WHERE session_id = :session_id AND emoji = :emoji AND user_id IS NULL');
            $checkStmt->bindValue(':session_id', $session_id, SQLITE3_TEXT);
            $checkStmt->bindValue(':emoji', $emoji, SQLITE3_TEXT);
        }

        $checkResult = $checkStmt->execute();
        $existingProfile = $checkResult->fetchArray(SQLITE3_ASSOC);

        logToFile('[animal_profile] SAVE - Existing profile check', [
            'has_user_id' => $user_id !== null,
            'existing_profile_id' => $existingProfile['id'] ?? null
        ]);

        if ($existingProfile) {
            // UPDATE существующего профиля (включая emoji!)
            $stmt = $db->prepare('
                UPDATE animal_profiles
                SET emoji = :emoji, kind = :kind, arial = :arial, role = :role, lifecycle = :lifecycle, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ');
            $stmt->bindValue(':id', $existingProfile['id'], SQLITE3_INTEGER);
            $stmt->bindValue(':emoji', $emoji, SQLITE3_TEXT);
            $stmt->bindValue(':kind', $kind, SQLITE3_TEXT);
            $stmt->bindValue(':arial', $arial, SQLITE3_TEXT);
            $stmt->bindValue(':role', $role, SQLITE3_TEXT);
            $stmt->bindValue(':lifecycle', $lifecycle, SQLITE3_TEXT);

            logToFile('[animal_profile] SAVE - Updating existing profile', [
                'id' => $existingProfile['id'],
                'new_emoji' => $emoji
            ]);
        } else {
            // INSERT нового профиля
            if ($user_id) {
                $stmt = $db->prepare('
                    INSERT INTO animal_profiles (user_id, session_id, emoji, kind, arial, role, lifecycle, created_at, updated_at)
                    VALUES (:user_id, :session_id, :emoji, :kind, :arial, :role, :lifecycle, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ');
                $stmt->bindValue(':user_id', $user_id, SQLITE3_INTEGER);
            } else {
                $stmt = $db->prepare('
                    INSERT INTO animal_profiles (session_id, emoji, kind, arial, role, lifecycle, created_at, updated_at)
                    VALUES (:session_id, :emoji, :kind, :arial, :role, :lifecycle, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ');
            }
            $stmt->bindValue(':session_id', $session_id, SQLITE3_TEXT);
            $stmt->bindValue(':emoji', $emoji, SQLITE3_TEXT);
            $stmt->bindValue(':kind', $kind, SQLITE3_TEXT);
            $stmt->bindValue(':arial', $arial, SQLITE3_TEXT);
            $stmt->bindValue(':role', $role, SQLITE3_TEXT);
            $stmt->bindValue(':lifecycle', $lifecycle, SQLITE3_TEXT);

            logToFile('[animal_profile] SAVE - Inserting new profile');
        }

        $executeResult = $stmt->execute();
        logToFile('[animal_profile] SAVE - Execute result', ['success' => (bool)$executeResult]);

        if ($executeResult) {
            // Update session name in chat.sqlite using centralized DB connection
            try {
                $chat_db = get_db(); // Use the centralized connection from server/db.php
                $new_name = $emoji . ' ' . $kind;
                
                $update_stmt = $chat_db->prepare('UPDATE sessions SET name = :name WHERE id = :session_id');
                $update_stmt->execute([':name' => $new_name, ':session_id' => $session_id]);
                
                $rowCount = $update_stmt->rowCount();
                
                // Verify the update by reading back
                $verify_stmt = $chat_db->prepare('SELECT name FROM sessions WHERE id = :session_id');
                $verify_stmt->execute([':session_id' => $session_id]);
                $current_name = $verify_stmt->fetchColumn();
                
                error_log('[animal_profile] Updated session ' . $session_id . ' to name: ' . $new_name . ' (rows affected: ' . $rowCount . ', verified: ' . $current_name . ')');
                
                echo json_encode([
                    'success' => true,
                    'debug' => [
                        'session_id' => $session_id,
                        'new_name' => $new_name,
                        'rows_affected' => $rowCount,
                        'verified_name' => $current_name
                    ]
                ]);
            } catch (Exception $e) {
                error_log('[animal_profile] ERROR updating session name: ' . $e->getMessage());
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        } else {
            echo json_encode(['error' => 'Failed to save profile']);
        }
        break;
        
    default:
        echo json_encode(['error' => 'Invalid action']);
}

$db->close();
