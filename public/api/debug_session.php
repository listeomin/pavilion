<?php
// Debug script to check session state
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$session_id = $_GET['session_id'] ?? '';

if (!$session_id) {
    echo json_encode(['error' => 'session_id required']);
    exit;
}

try {
    $db = get_db();
    
    // Get session from chat.sqlite
    $stmt = $db->prepare('SELECT id, name, created_at FROM sessions WHERE id = :id');
    $stmt->execute([':id' => $session_id]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get profile from animal.sqlite
    $animal_db_path = __DIR__ . '/../data/animal.sqlite';
    $animal_db = new SQLite3($animal_db_path);
    
    $stmt2 = $animal_db->prepare('SELECT * FROM animal_profiles WHERE session_id = :session_id');
    $stmt2->bindValue(':session_id', $session_id, SQLITE3_TEXT);
    $result = $stmt2->execute();
    
    $profiles = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $profiles[] = $row;
    }
    
    echo json_encode([
        'session_id' => $session_id,
        'session_in_chat_db' => $session,
        'profiles_in_animal_db' => $profiles
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
