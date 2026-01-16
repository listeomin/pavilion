<?php
// public/api/update_nest_name.php - обновление имени в Гнезде
session_start();
header('Content-Type: application/json');

// Check authorization
if (!isset($_SESSION['telegram_user']['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authorized']);
    exit;
}

$userId = $_SESSION['telegram_user']['user_id'];

// Get new name from POST
$data = json_decode(file_get_contents('php://input'), true);
$newName = trim($data['name'] ?? '');

// Validation
if (empty($newName)) {
    echo json_encode(['success' => false, 'error' => 'Name cannot be empty']);
    exit;
}

// Use strlen for character count (works with UTF-8)
if (strlen($newName) > 135) { // ~45 UTF-8 chars = ~135 bytes max
    echo json_encode(['success' => false, 'error' => 'Name too long (max 45 characters)']);
    exit;
}

try {
    require_once __DIR__ . '/../../server/db.php';
    $db = get_db();

    // Update telegram_first_name in users table
    $stmt = $db->prepare('UPDATE users SET telegram_first_name = :name WHERE id = :user_id');
    $stmt->execute([
        ':name' => $newName,
        ':user_id' => $userId
    ]);

    // Also update session
    $_SESSION['telegram_user']['telegram_first_name'] = $newName;

    echo json_encode([
        'success' => true,
        'name' => $newName
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
