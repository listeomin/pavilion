<?php
// branches.php - API for branches (topics/threads)

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';
require_once __DIR__ . '/../../server/config.php';
require_once __DIR__ . '/../../server/MessageRepository.php';
require_once __DIR__ . '/../../server/BroadcastService.php';

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
            $quoteText = $data['quote_text'] ?? null;
            $quoteAuthor = $data['quote_author'] ?? null;

            error_log('[Branches API] Create: telegramUserId=' . var_export($telegramUserId, true) . ', sessionId=' . var_export($sessionId, true));

            if (empty($title)) {
                throw new Exception('Title is required');
            }

            // Temporarily disable foreign key checks
            $db->exec('PRAGMA foreign_keys = OFF');

            // Only set creator_user_id if user is authenticated via Telegram and user exists
            if ($telegramUserId) {
                // Check if user exists
                $userCheck = $db->prepare('SELECT id FROM users WHERE id = :id');
                $userCheck->execute([':id' => $telegramUserId]);
                $userExists = $userCheck->fetch();
            } else {
                $userExists = false;
            }

            if ($userExists) {
                $stmt = $db->prepare('
                    INSERT INTO branches (title, creator_user_id, created_at)
                    VALUES (:title, :creator_user_id, datetime("now"))
                ');
                $stmt->execute([
                    ':title' => $title,
                    ':creator_user_id' => $telegramUserId
                ]);
            } else {
                $stmt = $db->prepare('
                    INSERT INTO branches (title, created_at)
                    VALUES (:title, datetime("now"))
                ');
                $stmt->execute([
                    ':title' => $title
                ]);
            }

            $branchId = $db->lastInsertId();

            // If quote data provided, create initial message with quote
            if ($quoteText && $quoteAuthor) {
                $quoteMetadata = json_encode([
                    'quote' => [
                        'text' => $quoteText,
                        'author' => $quoteAuthor
                    ]
                ]);

                // Create message with user_id only if authenticated, otherwise use session_id
                if ($telegramUserId) {
                    $stmt = $db->prepare('
                        INSERT INTO branch_messages (branch_id, user_id, session_id, text, metadata, created_at)
                        VALUES (:branch_id, :user_id, :session_id, :text, :metadata, datetime("now"))
                    ');
                    $stmt->execute([
                        ':branch_id' => $branchId,
                        ':user_id' => $telegramUserId,
                        ':session_id' => $sessionId,
                        ':text' => '',
                        ':metadata' => $quoteMetadata
                    ]);
                } else {
                    $stmt = $db->prepare('
                        INSERT INTO branch_messages (branch_id, session_id, text, metadata, created_at)
                        VALUES (:branch_id, :session_id, :text, :metadata, datetime("now"))
                    ');
                    $stmt->execute([
                        ':branch_id' => $branchId,
                        ':session_id' => $sessionId,
                        ':text' => '',
                        ':metadata' => $quoteMetadata
                    ]);
                }
            }

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

            // Send system message to main chat with branch link
            $basePath = get_base_path();
            $branchUrl = ($_SERVER['REQUEST_SCHEME'] ?? 'https') . '://' .
                         ($_SERVER['HTTP_HOST'] ?? 'murmuration.monster') .
                         $basePath . '/branches/' . $branchId;

            $msgRepo = new MessageRepository();
            $broadcastService = new BroadcastService();

            // Add branch preview metadata
            $branchMetadata = [
                'type' => 'branch',
                'title' => $title,
                'branch_id' => $branchId,
                'url' => $branchUrl
            ];

            $systemMessage = $msgRepo->add(
                'SYSTEM',
                '🛳️ капитанская рубка',
                'Создана новая ветка: ' . $branchUrl,
                $branchMetadata
            );

            $broadcastService->messageNew($systemMessage);

            // Re-enable foreign key checks
            $db->exec('PRAGMA foreign_keys = ON');

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
    error_log('[Branches API] Error: ' . $e->getMessage());
    error_log('[Branches API] Stack trace: ' . $e->getTraceAsString());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
