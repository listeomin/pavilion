<?php
// public/api/discussions.php - API for managing Nest discussions (quote-based comments)
session_start();
date_default_timezone_set('Europe/Moscow');
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$db = get_db();

// Helper function to get user session info from animal profile
function getUserSessionInfo($chatSessionId = null) {
    // Use chat_session_id from cookie if not provided
    if (!$chatSessionId) {
        $chatSessionId = $_COOKIE['chat_session_id'] ?? null;
    }

    $animalDbPath = __DIR__ . '/../data/animal.sqlite';

    // First check if user is authorized via Telegram
    $telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;

    if ($telegramUserId && file_exists($animalDbPath)) {
        try {
            $animalDb = new PDO('sqlite:' . $animalDbPath);
            $animalDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // For authorized users: look up by user_id
            $stmt = $animalDb->prepare('
                SELECT emoji, kind FROM animal_profiles
                WHERE user_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
            ');
            $stmt->execute([$telegramUserId]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($profile) {
                $emoji = $profile['emoji'] ?: '🦔';
                $name = $profile['kind'] ?: 'Аноним';
                return ['session_id' => $chatSessionId ?: session_id(), 'emoji' => $emoji, 'name' => $name, 'user_id' => $telegramUserId];
            }
        } catch (Exception $e) {
            // Fallback to session-based lookup
        }
    }

    // Fallback: Try to get profile by session_id
    if ($chatSessionId && file_exists($animalDbPath)) {
        try {
            $animalDb = new PDO('sqlite:' . $animalDbPath);
            $animalDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            $stmt = $animalDb->prepare('
                SELECT emoji, kind FROM animal_profiles
                WHERE session_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
            ');
            $stmt->execute([$chatSessionId]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($profile) {
                $emoji = $profile['emoji'] ?: '🦔';
                $name = $profile['kind'] ?: 'Аноним';
                return ['session_id' => $chatSessionId, 'emoji' => $emoji, 'name' => $name];
            }
        } catch (Exception $e) {
            // Fallback to defaults
        }
    }

    // Fallback to defaults
    $sessionId = $chatSessionId ?: session_id();
    return ['session_id' => $sessionId, 'emoji' => '🦔', 'name' => 'Аноним'];
}

// Get current logged in user_id (from Telegram auth)
function getCurrentUserId() {
    return $_SESSION['telegram_user']['user_id'] ?? null;
}

// Check if current user is the author of the post
function isPostAuthor($db, $postId) {
    $currentUserId = getCurrentUserId();
    if (!$currentUserId) return false;

    $stmt = $db->prepare('SELECT user_id FROM nest_posts WHERE id = ?');
    $stmt->execute([$postId]);
    $post = $stmt->fetch(PDO::FETCH_ASSOC);

    return $post && intval($post['user_id']) === intval($currentUserId);
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

    // LIST: Get discussions for post(s) or all discussions for a blog
    elseif ($action === 'list') {
        $postId = $_GET['post_id'] ?? null;
        $postIds = isset($_GET['post_ids']) ? explode(',', $_GET['post_ids']) : null;
        $username = $_GET['username'] ?? null; // For getting all discussions in a blog

        // Check if current user is author of the blog
        $canDelete = false;
        $isOwner = false;

        if ($username) {
            // Get all discussions for a blog by username
            // First, get user_id from username
            $userStmt = $db->prepare('SELECT id FROM users WHERE username = ? OR telegram_id = ?');
            $userStmt->execute([$username, $username]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                echo json_encode(['success' => false, 'error' => 'User not found']);
                exit;
            }

            $blogUserId = $user['id'];
            $currentUserId = getCurrentUserId();
            $isOwner = $currentUserId && intval($currentUserId) === intval($blogUserId);
            $canDelete = $isOwner;

            // Get all discussions for posts owned by this user, sorted by last activity
            $stmt = $db->prepare('
                SELECT d.*,
                       COUNT(c.id) as comment_count,
                       MAX(c.created_at) as last_comment_at,
                       COALESCE(MAX(c.created_at), d.created_at) as last_activity
                FROM nest_discussions d
                LEFT JOIN nest_discussion_comments c ON d.id = c.discussion_id
                INNER JOIN nest_posts p ON d.post_id = p.id
                WHERE p.user_id = ?
                GROUP BY d.id
                ORDER BY last_activity DESC
            ');
            $stmt->execute([$blogUserId]);
        } elseif (!$postId && !$postIds) {
            echo json_encode(['success' => false, 'error' => 'post_id, post_ids, or username required']);
            exit;
        } elseif ($postId) {
            $canDelete = isPostAuthor($db, $postId);
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

        // Get latest comment for each discussion (for preview)
        foreach ($discussions as &$discussion) {
            $latestStmt = $db->prepare('
                SELECT comment_text, created_by_emoji, created_by_name, created_at
                FROM nest_discussion_comments
                WHERE discussion_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $latestStmt->execute([$discussion['id']]);
            $latestComment = $latestStmt->fetch(PDO::FETCH_ASSOC);
            $discussion['latest_comment'] = $latestComment ?: null;
        }
        unset($discussion);

        echo json_encode([
            'success' => true,
            'discussions' => $discussions,
            'can_delete' => $canDelete,
            'is_owner' => $isOwner ?? false
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

        // Check if current user is the post author
        $canDelete = isPostAuthor($db, $discussion['post_id']);

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
            'comments' => $comments,
            'can_delete' => $canDelete
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

    // DELETE: Delete a discussion (only for post author)
    elseif ($action === 'delete') {
        $data = json_decode(file_get_contents('php://input'), true);
        $discussionId = $data['discussion_id'] ?? $_GET['id'] ?? null;

        if (!$discussionId) {
            echo json_encode(['success' => false, 'error' => 'discussion_id required']);
            exit;
        }

        // Get discussion to check post_id
        $stmt = $db->prepare('SELECT post_id FROM nest_discussions WHERE id = ?');
        $stmt->execute([$discussionId]);
        $discussion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$discussion) {
            echo json_encode(['success' => false, 'error' => 'Discussion not found']);
            exit;
        }

        // Check if current user is the post author
        if (!isPostAuthor($db, $discussion['post_id'])) {
            echo json_encode(['success' => false, 'error' => 'Permission denied. Only the post author can delete discussions.']);
            exit;
        }

        // Delete comments first, then discussion
        $db->beginTransaction();

        $stmt = $db->prepare('DELETE FROM nest_discussion_comments WHERE discussion_id = ?');
        $stmt->execute([$discussionId]);

        $stmt = $db->prepare('DELETE FROM nest_discussions WHERE id = ?');
        $stmt->execute([$discussionId]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Discussion deleted'
        ]);
    }

    else {
        echo json_encode(['success' => false, 'error' => 'Unknown action']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
