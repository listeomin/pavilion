<?php
// api/animal_profile.php
header('Content-Type: application/json');

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
        $input = json_decode(file_get_contents('php://input'), true);
        $session_id = $input['session_id'] ?? '';
        $emoji = $input['emoji'] ?? '';
        $kind = $input['kind'] ?? '';
        $arial = $input['arial'] ?? '';
        $role = $input['role'] ?? '';
        $lifecycle = $input['lifecycle'] ?? '';
        
        if (!$session_id || !$emoji || !$kind) {
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }
        
        // Validate kind length
        if (mb_strlen($kind) < 2) {
            echo json_encode(['error' => 'Kind must be at least 2 characters']);
            exit;
        }
        
        // Check for profanity (placeholder - will be implemented with dictionary)
        // TODO: Load badwords.txt and check
        
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
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to save profile']);
        }
        break;
        
    default:
        echo json_encode(['error' => 'Invalid action']);
}

$db->close();
