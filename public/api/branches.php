<?php
// branches.php - API for branches (topics/threads)

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$action = $_GET['action'] ?? '';

try {
    $db = get_db();

    // Get session info
    $sessionId = $_SESSION['session_id'] ?? null;
    $telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;

    switch ($action) {
        case 'get_branches':
            // Get all branches
            $stmt = $db->prepare('
                SELECT
                    b.id,
                    b.title,
                    b.creator_user_id as creatorUserId,
                    b.created_at as createdAt,
                    u.telegram_first_name as creatorFirstName,
                    u.telegram_username as creatorUsername,
                    (SELECT COUNT(*) FROM branch_messages WHERE branch_id = b.id) as messageCount
                FROM branches b
                LEFT JOIN users u ON b.creator_user_id = u.id
                ORDER BY b.created_at DESC
            ');
            $stmt->execute();
            $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'branches' => $branches
            ]);
            break;

        case 'create':
            // Create new branch
            $data = json_decode(file_get_contents('php://input'), true);
            $title = $data['title'] ?? '';

            if (empty($title)) {
                throw new Exception('Title is required');
            }

            $stmt = $db->prepare('
                INSERT INTO branches (title, creator_user_id, created_at)
                VALUES (:title, :creator_user_id, datetime("now"))
            ');
            $stmt->execute([
                ':title' => $title,
                ':creator_user_id' => $telegramUserId
            ]);

            $branchId = $db->lastInsertId();

            // Get created branch
            $stmt = $db->prepare('
                SELECT
                    b.id,
                    b.title,
                    b.creator_user_id as creatorUserId,
                    b.created_at as createdAt
                FROM branches b
                WHERE b.id = :id
            ');
            $stmt->execute([':id' => $branchId]);
            $branch = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'branch' => $branch
            ]);
            break;

        case 'get_messages':
            // Get messages for a branch
            $branchId = $_GET['branch_id'] ?? '';

            if (empty($branchId)) {
                throw new Exception('Branch ID is required');
            }

            $stmt = $db->prepare('
                SELECT
                    bm.id,
                    bm.branch_id as branchId,
                    bm.user_id as userId,
                    bm.session_id as sessionId,
                    bm.text,
                    bm.metadata,
                    bm.created_at as createdAt,
                    u.telegram_first_name as userFirstName,
                    u.telegram_username as username,
                    CASE
                        WHEN u.id = :telegram_user_id THEN 1
                        WHEN bm.session_id = :session_id AND u.id IS NULL THEN 1
                        ELSE 0
                    END as fromMe
                FROM branch_messages bm
                LEFT JOIN users u ON bm.user_id = u.id
                WHERE bm.branch_id = :branch_id
                ORDER BY bm.created_at ASC
            ');
            $stmt->execute([
                ':branch_id' => $branchId,
                ':telegram_user_id' => $telegramUserId,
                ':session_id' => $sessionId
            ]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse metadata
            foreach ($messages as &$msg) {
                $msg['fromMe'] = (bool)$msg['fromMe'];
                $msg['metadata'] = $msg['metadata'] ? json_decode($msg['metadata'], true) : null;
            }

            echo json_encode([
                'success' => true,
                'messages' => $messages
            ]);
            break;

        case 'send':
            // Send message to branch
            $data = json_decode(file_get_contents('php://input'), true);
            $branchId = $data['branch_id'] ?? '';
            $text = $data['text'] ?? '';
            $metadata = $data['metadata'] ?? null;

            if (empty($branchId) || empty($text)) {
                throw new Exception('Branch ID and text are required');
            }

            $stmt = $db->prepare('
                INSERT INTO branch_messages (branch_id, user_id, session_id, text, metadata, created_at)
                VALUES (:branch_id, :user_id, :session_id, :text, :metadata, datetime("now"))
            ');
            $stmt->execute([
                ':branch_id' => $branchId,
                ':user_id' => $telegramUserId,
                ':session_id' => $sessionId,
                ':text' => $text,
                ':metadata' => $metadata ? json_encode($metadata) : null
            ]);

            $messageId = $db->lastInsertId();

            // Get created message
            $stmt = $db->prepare('
                SELECT
                    bm.id,
                    bm.branch_id as branchId,
                    bm.user_id as userId,
                    bm.text,
                    bm.metadata,
                    bm.created_at as createdAt,
                    1 as fromMe
                FROM branch_messages bm
                WHERE bm.id = :id
            ');
            $stmt->execute([':id' => $messageId]);
            $message = $stmt->fetch(PDO::FETCH_ASSOC);
            $message['fromMe'] = true;
            $message['metadata'] = $message['metadata'] ? json_decode($message['metadata'], true) : null;

            echo json_encode([
                'success' => true,
                'message' => $message
            ]);
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
