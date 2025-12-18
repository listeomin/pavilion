<?php
ini_set('display_errors', 1); error_reporting(E_ALL);
// api/animal_profile.php
header('Content-Type: application/json');

// Use the centralized DB connection that already knows the correct path
try {
    require_once __DIR__ . '/../../server/db.php';
} catch (Exception $e) {
    echo json_encode(['error' => 'Failed to load db.php: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';
$db_path = __DIR__ . '/../data/animal.sqlite';

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
        $session_id = $_GET['session_id'] ?? '';
        $emoji = $_GET['emoji'] ?? '';
        
        if (!$session_id || !$emoji) {
            echo json_encode(['error' => 'Missing parameters']);
            exit;
        }
        
        $stmt = $db->prepare('SELECT * FROM animal_profiles WHERE session_id = :session_id AND emoji = :emoji');
        $stmt->bindValue(':session_id', $session_id, SQLITE3_TEXT);
        $stmt->bindValue(':emoji', $emoji, SQLITE3_TEXT);
        $result = $stmt->execute();
        $row = $result->fetchArray(SQLITE3_ASSOC);
        
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
        $raw_input = file_get_contents('php://input');
        error_log('[animal_profile] Raw input: ' . $raw_input);
        
        $input = json_decode($raw_input, true);
        error_log('[animal_profile] Decoded input: ' . json_encode($input));
        
        $session_id = $input['session_id'] ?? '';
        $emoji = $input['emoji'] ?? '';
        $kind = $input['kind'] ?? '';
        $arial = $input['arial'] ?? '';
        $role = $input['role'] ?? '';
        $lifecycle = $input['lifecycle'] ?? '';
        
        error_log('[animal_profile] Parsed: session_id=' . $session_id . ', emoji=' . $emoji . ', kind=' . $kind);
        
        if (!$session_id || !$emoji || !$kind) {
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }
        
        // Validate kind length
        if (mb_strlen($kind) < 2) {
            echo json_encode(['error' => 'Kind must be at least 2 characters']);
            exit;
        }
        
        // Check for profanity
        $dirty_words_file = __DIR__ . '/../data/dirty.txt';
        if (file_exists($dirty_words_file)) {
            $dirty_words = array_map('trim', file($dirty_words_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
            $kind_lower = mb_strtolower($kind);
            
            foreach ($dirty_words as $word) {
                if (mb_stripos($kind_lower, mb_strtolower($word)) !== false) {
                    echo json_encode(['error' => 'Profanity detected']);
                    exit;
                }
            }
        }
        
        $stmt = $db->prepare('
            INSERT INTO animal_profiles (session_id, emoji, kind, arial, role, lifecycle, updated_at)
            VALUES (:session_id, :emoji, :kind, :arial, :role, :lifecycle, CURRENT_TIMESTAMP)
            ON CONFLICT(session_id, emoji) DO UPDATE SET
                kind = :kind,
                arial = :arial,
                role = :role,
                lifecycle = :lifecycle,
                updated_at = CURRENT_TIMESTAMP
        ');
        
        $stmt->bindValue(':session_id', $session_id, SQLITE3_TEXT);
        $stmt->bindValue(':emoji', $emoji, SQLITE3_TEXT);
        $stmt->bindValue(':kind', $kind, SQLITE3_TEXT);
        $stmt->bindValue(':arial', $arial, SQLITE3_TEXT);
        $stmt->bindValue(':role', $role, SQLITE3_TEXT);
        $stmt->bindValue(':lifecycle', $lifecycle, SQLITE3_TEXT);
        
        if ($stmt->execute()) {
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
