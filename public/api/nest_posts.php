<?php
// public/api/nest_posts.php - API for managing Nest posts
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$db = get_db();

try {
    if ($action === 'list') {
        // Get all posts for a user
        $username = $_GET['username'] ?? null;
        
        if (!$username) {
            echo json_encode(['success' => false, 'error' => 'Username required']);
            exit;
        }

        // Get user_id by username
        if (!is_numeric($username)) {
            $stmt = $db->prepare('SELECT id FROM users WHERE telegram_username = :username LIMIT 1');
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $userId = $user ? $user['id'] : null;
        } else {
            $stmt = $db->prepare('SELECT id FROM users WHERE telegram_id = :telegram_id LIMIT 1');
            $stmt->execute([':telegram_id' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $userId = $user ? $user['id'] : null;
        }

        if (!$userId) {
            echo json_encode(['success' => true, 'posts' => []]);
            exit;
        }

        // Get all posts for this user
        $stmt = $db->prepare('SELECT id, slug, title, content, position, tag, created_date, created_at, updated_at FROM nest_posts WHERE user_id = :user_id ORDER BY position ASC');
        $stmt->execute([':user_id' => $userId]);
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'posts' => $posts
        ]);

    } elseif ($action === 'get') {
        // Get single post by slug
        $username = $_GET['username'] ?? null;
        $slug = $_GET['slug'] ?? null;

        if (!$username || !$slug) {
            echo json_encode(['success' => false, 'error' => 'Username and slug required']);
            exit;
        }

        // Get user_id
        if (!is_numeric($username)) {
            $stmt = $db->prepare('SELECT id FROM users WHERE telegram_username = :username LIMIT 1');
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $userId = $user ? $user['id'] : null;
        } else {
            $stmt = $db->prepare('SELECT id FROM users WHERE telegram_id = :telegram_id LIMIT 1');
            $stmt->execute([':telegram_id' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $userId = $user ? $user['id'] : null;
        }

        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'User not found']);
            exit;
        }

        // Get post
        $stmt = $db->prepare('SELECT id, slug, title, content, position, tag, created_date, created_at, updated_at FROM nest_posts WHERE user_id = :user_id AND slug = :slug LIMIT 1');
        $stmt->execute([':user_id' => $userId, ':slug' => $slug]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($post) {
            echo json_encode([
                'success' => true,
                'post' => $post
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Post not found'
            ]);
        }

    } elseif ($action === 'create') {
        $telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;
        if (!$telegramUserId) {
            echo json_encode(['success' => false, 'error' => 'Authentication required']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $content = $input['content'] ?? '{}';
        $position = $input['position'] ?? null;

        $timestamp = time();
        $slug = 'post-' . $timestamp;
        $title = 'Новая статья';
        $now = date('Y-m-d H:i:s');

        if ($position !== null) {
            $stmt = $db->prepare('UPDATE nest_posts SET position = position + 1 WHERE user_id = :user_id AND position >= :position');
            $stmt->execute([':user_id' => $telegramUserId, ':position' => $position]);
        } else {
            $stmt = $db->prepare('SELECT MAX(position) as max_pos FROM nest_posts WHERE user_id = :user_id');
            $stmt->execute([':user_id' => $telegramUserId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $position = ($result['max_pos'] ?? -1) + 1;
        }

        $stmt = $db->prepare('INSERT INTO nest_posts (user_id, slug, title, content, position, created_at, updated_at) VALUES (:user_id, :slug, :title, :content, :position, :created_at, :updated_at)');
        $stmt->execute([':user_id' => $telegramUserId, ':slug' => $slug, ':title' => $title, ':content' => $content, ':position' => $position, ':created_at' => $now, ':updated_at' => $now]);

        echo json_encode(['success' => true, 'post' => ['id' => $db->lastInsertId(), 'slug' => $slug, 'title' => $title, 'content' => $content, 'position' => $position, 'created_at' => $now, 'updated_at' => $now]]);

    } elseif ($action === 'update') {
        $telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;
        if (!$telegramUserId) {
            echo json_encode(['success' => false, 'error' => 'Authentication required']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $postId = $input['id'] ?? null;
        $content = $input['content'] ?? null;
        $title = $input['title'] ?? null;
        $slug = $input['slug'] ?? null;
        $tag = $input['tag'] ?? null;
        $createdDate = isset($input['created_date']) ? $input['created_date'] : null;

        if (!$postId) {
            echo json_encode(['success' => false, 'error' => 'Post ID required']);
            exit;
        }

        $stmt = $db->prepare('SELECT id, slug, title, content FROM nest_posts WHERE id = :id AND user_id = :user_id');
        $stmt->execute([':id' => $postId, ':user_id' => $telegramUserId]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            echo json_encode(['success' => false, 'error' => 'Post not found']);
            exit;
        }

        // Build dynamic update query
        $updates = [];
        $params = [':id' => $postId, ':user_id' => $telegramUserId];

        if ($content !== null) {
            $updates[] = 'content = :content';
            $params[':content'] = $content;
        }

        if ($title !== null) {
            $updates[] = 'title = :title';
            $params[':title'] = $title;
        }

        if ($slug !== null) {
            $updates[] = 'slug = :slug';
            $params[':slug'] = $slug;
        }

        if ($tag !== null) {
            $updates[] = 'tag = :tag';
            $params[':tag'] = $tag;
        }

        if (isset($input['created_date'])) {
            $updates[] = 'created_date = :created_date';
            $params[':created_date'] = $createdDate;
        }

        $now = date('Y-m-d H:i:s');
        $updates[] = 'updated_at = :updated_at';
        $params[':updated_at'] = $now;

        $sql = 'UPDATE nest_posts SET ' . implode(', ', $updates) . ' WHERE id = :id AND user_id = :user_id';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        echo json_encode([
            'success' => true,
            'post' => [
                'id' => $postId,
                'slug' => $slug ?? $post['slug'],
                'title' => $title ?? $post['title'],
                'content' => $content ?? $post['content'],
                'updated_at' => $now
            ]
        ]);

    } elseif ($action === 'delete') {
        $telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;
        if (!$telegramUserId) {
            echo json_encode(['success' => false, 'error' => 'Authentication required']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $postId = $input['id'] ?? null;

        if (!$postId) {
            echo json_encode(['success' => false, 'error' => 'Post ID required']);
            exit;
        }

        $stmt = $db->prepare('DELETE FROM nest_posts WHERE id = :id AND user_id = :user_id');
        $stmt->execute([':id' => $postId, ':user_id' => $telegramUserId]);

        echo json_encode(['success' => $stmt->rowCount() > 0]);

    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
