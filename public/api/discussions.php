<?php
// public/api/discussions.php - API for managing Nest discussions (quote-based comments)
session_start();
date_default_timezone_set('Europe/Moscow');
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$db = get_db();

// Helper function to get user session info
function getUserSessionInfo() {
    $sessionId = session_id();
    $emoji = $_SESSION['emoji'] ?? '🦔';
    $name = $_SESSION['name'] ?? 'Аноним';
    return ['session_id' => $sessionId, 'emoji' => $emoji, 'name' => $name];
}

try {
    // CREATE: Create a new discussion (quote)
    if ($action === 'create') {
        $data = json_decode(file_get_contents('php://input'), true);

        $postId = $data['post_id'] ?? null;
        $quoteText = $data['quote_text'] ?? null;
        $positionStart = $data['position_start'] ?? null;
        $positionEnd = $data['position_end'] ?? null;
        $contextBefore = $data['context_before'] ?? '';
        $contextAfter = $data['context_after'] ?? '';
        $initialComment = $data['initial_comment'] ?? null;

        if (!$postId || !$quoteText || $positionStart === null || $positionEnd === null) {
            echo json_encode(['success' => false, 'error' => 'Missing required fields']);
            exit;
        }

        $quoteHash = md5($quoteText);
        $userInfo = getUserSessionInfo();

        $db->beginTransaction();

        // Create discussion
        $stmt = $db->prepare('
            INSERT INTO nest_discussions (
                post_id, quote_text, quote_hash,
                position_start, position_end,
                context_before, context_after,
                created_by_session, created_by_emoji, created_by_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $postId, $quoteText, $quoteHash,
            $positionStart, $positionEnd,
            $contextBefore, $contextAfter,
            $userInfo['session_id'], $userInfo['emoji'], $userInfo['name']
        ]);

        $discussionId = $db->lastInsertId();

        // Add initial comment if provided
        if ($initialComment && trim($initialComment) !== '') {
            $stmt = $db->prepare('
                INSERT INTO nest_discussion_comments (
                    discussion_id, comment_text,
                    created_by_session, created_by_emoji, created_by_name
                ) VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $discussionId, $initialComment,
                $userInfo['session_id'], $userInfo['emoji'], $userInfo['name']
            ]);
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'discussion_id' => $discussionId
        ]);
    }

    // CHECK_DUPLICATE: Check if quote already exists
    elseif ($action === 'check_duplicate') {
        $postId = $_GET['post_id'] ?? null;
        $quoteText = $_GET['quote_text'] ?? null;

        if (!$postId || !$quoteText) {
            echo json_encode(['success' => false, 'error' => 'Missing parameters']);
            exit;
        }

        $quoteHash = md5($quoteText);

        $stmt = $db->prepare('
            SELECT id FROM nest_discussions
            WHERE post_id = ? AND quote_hash = ?
            LIMIT 1
        ');
        $stmt->execute([$postId, $quoteHash]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'exists' => $existing !== false,
            'discussion_id' => $existing ? $existing['id'] : null
        ]);
    }

    // LIST: Get discussions for post(s)
    elseif ($action === 'list') {
        $postId = $_GET['post_id'] ?? null;
        $postIds = isset($_GET['post_ids']) ? explode(',', $_GET['post_ids']) : null;

        if (!$postId && !$postIds) {
            echo json_encode(['success' => false, 'error' => 'post_id or post_ids required']);
            exit;
        }

        if ($postId) {
            $stmt = $db->prepare('
                SELECT d.*,
                       COUNT(c.id) as comment_count,
                       MAX(c.created_at) as last_comment_at
                FROM nest_discussions d
                LEFT JOIN nest_discussion_comments c ON d.id = c.discussion_id
                WHERE d.post_id = ?
                GROUP BY d.id
                ORDER BY d.created_at DESC
            ');
            $stmt->execute([$postId]);
        } else {
            $placeholders = implode(',', array_fill(0, count($postIds), '?'));
            $stmt = $db->prepare("
                SELECT d.*,
                       COUNT(c.id) as comment_count,
                       MAX(c.created_at) as last_comment_at
                FROM nest_discussions d
                LEFT JOIN nest_discussion_comments c ON d.id = c.discussion_id
                WHERE d.post_id IN ($placeholders)
                GROUP BY d.id
                ORDER BY last_comment_at DESC, d.created_at DESC
            ");
            $stmt->execute($postIds);
        }

        $discussions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'discussions' => $discussions
        ]);
    }

    // GET: Get single discussion with all comments
    elseif ($action === 'get') {
        $discussionId = $_GET['id'] ?? null;

        if (!$discussionId) {
            echo json_encode(['success' => false, 'error' => 'discussion_id required']);
            exit;
        }

        // Get discussion
        $stmt = $db->prepare('SELECT * FROM nest_discussions WHERE id = ?');
        $stmt->execute([$discussionId]);
        $discussion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$discussion) {
            echo json_encode(['success' => false, 'error' => 'Discussion not found']);
            exit;
        }

        // Get comments
        $stmt = $db->prepare('
            SELECT * FROM nest_discussion_comments
            WHERE discussion_id = ?
            ORDER BY created_at ASC
        ');
        $stmt->execute([$discussionId]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'discussion' => $discussion,
            'comments' => $comments
        ]);
    }

    // ADD_COMMENT: Add comment to existing discussion
    elseif ($action === 'add_comment') {
        $data = json_decode(file_get_contents('php://input'), true);

        $discussionId = $data['discussion_id'] ?? null;
        $commentText = $data['comment_text'] ?? null;

        if (!$discussionId || !$commentText || trim($commentText) === '') {
            echo json_encode(['success' => false, 'error' => 'Missing required fields']);
            exit;
        }

        $userInfo = getUserSessionInfo();

        $stmt = $db->prepare('
            INSERT INTO nest_discussion_comments (
                discussion_id, comment_text,
                created_by_session, created_by_emoji, created_by_name
            ) VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $discussionId, $commentText,
            $userInfo['session_id'], $userInfo['emoji'], $userInfo['name']
        ]);

        $commentId = $db->lastInsertId();

        // Update discussion updated_at
        $stmt = $db->prepare('UPDATE nest_discussions SET updated_at = datetime("now") WHERE id = ?');
        $stmt->execute([$discussionId]);

        echo json_encode([
            'success' => true,
            'comment_id' => $commentId
        ]);
    }

    else {
        echo json_encode(['success' => false, 'error' => 'Unknown action']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
