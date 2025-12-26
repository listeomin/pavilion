<?php
// public/api/nest_content.php - API for managing Nest content
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'get';
$db = get_db();

try {
    if ($action === 'get') {
        // Get content for viewing
        // Determine which user's content to load
        $urlUsername = $_GET['username'] ?? null;
        $targetUserId = null;

        if ($urlUsername) {
            // Load content for specific user by username
            if (!is_numeric($urlUsername)) {
                $stmt = $db->prepare('SELECT id FROM users WHERE telegram_username = :username LIMIT 1');
                $stmt->execute([':username' => $urlUsername]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                $targetUserId = $user ? $user['id'] : null;
            } else {
                $stmt = $db->prepare('SELECT id FROM users WHERE telegram_id = :telegram_id LIMIT 1');
                $stmt->execute([':telegram_id' => $urlUsername]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                $targetUserId = $user ? $user['id'] : null;
            }
        } else {
            // Load content for current user (from session)
            $targetUserId = $_SESSION['telegram_user']['user_id'] ?? null;
        }

        if (!$targetUserId) {
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        // Get content from database
        $stmt = $db->prepare('SELECT content, updated_at FROM nest_content WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $targetUserId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $content = json_decode($row['content'], true);
            echo json_encode([
                'success' => true,
                'content' => $content,
                'updated_at' => $row['updated_at']
            ]);
        } else {
            // No content yet
            echo json_encode([
                'success' => true,
                'content' => null
            ]);
        }

    } elseif ($action === 'save') {
        // Save content (only for authorized users in their own nest)
        if (!isset($_SESSION['telegram_user']['user_id'])) {
            echo json_encode(['success' => false, 'error' => 'Not authorized']);
            exit;
        }

        $userId = $_SESSION['telegram_user']['user_id'];

        // Get content from POST body
        $input = json_decode(file_get_contents('php://input'), true);
        $content = $input['content'] ?? null;

        if ($content === null) {
            echo json_encode(['success' => false, 'error' => 'No content provided']);
            exit;
        }

        // Save to database (upsert)
        $now = date('Y-m-d H:i:s');
        $contentJson = json_encode($content);

        $stmt = $db->prepare('
            INSERT INTO nest_content (user_id, content, created_at, updated_at)
            VALUES (:user_id, :content, :created_at, :updated_at)
            ON CONFLICT(user_id) DO UPDATE SET
                content = :content,
                updated_at = :updated_at
        ');

        $stmt->execute([
            ':user_id' => $userId,
            ':content' => $contentJson,
            ':created_at' => $now,
            ':updated_at' => $now
        ]);

        echo json_encode([
            'success' => true,
            'updated_at' => $now
        ]);

    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
