<?php
// public/api/nest_sections.php - API for managing Nest sections
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'get';
$db = get_db();

try {
    if ($action === 'get') {
        // Get sections for viewing
        $urlUsername = $_GET['username'] ?? null;
        $targetUserId = null;

        if ($urlUsername) {
            // Load sections for specific user by username
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
            // Load sections for current user (from session)
            $targetUserId = $_SESSION['telegram_user']['user_id'] ?? null;
        }

        if (!$targetUserId) {
            echo json_encode(['success' => true, 'sections' => []]);
            exit;
        }

        // Get sections from database
        $stmt = $db->prepare('SELECT sections FROM nest_sections WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $targetUserId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $sections = json_decode($row['sections'], true);
            echo json_encode([
                'success' => true,
                'sections' => $sections ?? []
            ]);
        } else {
            // No sections yet
            echo json_encode([
                'success' => true,
                'sections' => []
            ]);
        }

    } elseif ($action === 'save') {
        // Save sections (only for authorized users in their own nest)
        if (!isset($_SESSION['telegram_user']['user_id'])) {
            echo json_encode(['success' => false, 'error' => 'Not authorized']);
            exit;
        }

        $currentUserId = $_SESSION['telegram_user']['user_id'];

        // Get sections from POST body
        $input = json_decode(file_get_contents('php://input'), true);
        $sections = $input['sections'] ?? null;

        if ($sections === null || !is_array($sections)) {
            echo json_encode(['success' => false, 'error' => 'Invalid sections data']);
            exit;
        }

        // Save to database (upsert)
        $now = date('Y-m-d H:i:s');
        $sectionsJson = json_encode($sections);

        $stmt = $db->prepare('
            INSERT INTO nest_sections (user_id, sections, updated_at)
            VALUES (:user_id, :sections, :updated_at)
            ON CONFLICT(user_id) DO UPDATE SET
                sections = :sections,
                updated_at = :updated_at
        ');

        $stmt->execute([
            ':user_id' => $currentUserId,
            ':sections' => $sectionsJson,
            ':updated_at' => $now
        ]);

        echo json_encode(['success' => true]);

    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
