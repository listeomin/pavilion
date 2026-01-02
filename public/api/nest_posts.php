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
        $stmt = $db->prepare('SELECT id, slug, title, content, created_at, updated_at FROM nest_posts WHERE user_id = :user_id ORDER BY id ASC');
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
        $stmt = $db->prepare('SELECT id, slug, title, content, created_at, updated_at FROM nest_posts WHERE user_id = :user_id AND slug = :slug LIMIT 1');
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

    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
