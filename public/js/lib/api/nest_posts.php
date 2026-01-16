<?php
// public/api/nest_posts.php - API for managing Nest posts
session_start();
date_default_timezone_set('Europe/Moscow');
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';
require_once __DIR__ . '/../../server/post_counts.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$db = get_db();

try {
    if ($action === 'list_metadata') {
        // Get only metadata (id, slug, title, tag) for navigation - no content
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

        // Get only metadata, no content
        $stmt = $db->prepare('SELECT id, slug, title, tag, position, created_date, created_at, updated_at FROM nest_posts WHERE user_id = :user_id ORDER BY position ASC');
        $stmt->execute([':user_id' => $userId]);
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'posts' => $posts,
            'total' => count($posts)
        ]);

    } elseif ($action === 'get_counts') {
        // Get post counts per tag/category (fast, no posts loading)
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
            echo json_encode(['success' => true, 'counts' => []]);
            exit;
        }

        // Get counts from cached table
        $counts = get_post_counts($db, $userId);

        // Convert to key-value format for easier frontend use
        $countsMap = [];
        foreach ($counts as $row) {
            $countsMap[$row['tag']] = (int)$row['count'];
        }

        echo json_encode([
            'success' => true,
            'counts' => $countsMap
        ]);

    } elseif ($action === 'list') {
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

        // Get posts with optional pagination and tag filter
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $tag = isset($_GET['tag']) ? trim($_GET['tag']) : null;

        // Convert Cyrillic to lowercase (mb_strtolower not available, MySQL LOWER() doesn't work with UTF-8)
        if ($tag) {
            $tag = strtr($tag, [
                'А' => 'а', 'Б' => 'б', 'В' => 'в', 'Г' => 'г', 'Д' => 'д', 'Е' => 'е', 'Ё' => 'ё',
                'Ж' => 'ж', 'З' => 'з', 'И' => 'и', 'Й' => 'й', 'К' => 'к', 'Л' => 'л', 'М' => 'м',
                'Н' => 'н', 'О' => 'о', 'П' => 'п', 'Р' => 'р', 'С' => 'с', 'Т' => 'т', 'У' => 'у',
                'Ф' => 'ф', 'Х' => 'х', 'Ц' => 'ц', 'Ч' => 'ч', 'Ш' => 'ш', 'Щ' => 'щ', 'Ъ' => 'ъ',
                'Ы' => 'ы', 'Ь' => 'ь', 'Э' => 'э', 'Ю' => 'ю', 'Я' => 'я',
                'A' => 'a', 'B' => 'b', 'C' => 'c', 'D' => 'd', 'E' => 'e', 'F' => 'f', 'G' => 'g',
                'H' => 'h', 'I' => 'i', 'J' => 'j', 'K' => 'k', 'L' => 'l', 'M' => 'm', 'N' => 'n',
                'O' => 'o', 'P' => 'p', 'Q' => 'q', 'R' => 'r', 'S' => 's', 'T' => 't', 'U' => 'u',
                'V' => 'v', 'W' => 'w', 'X' => 'x', 'Y' => 'y', 'Z' => 'z'
            ]);
        }

        // LOG: Write to file for debugging
        $logFile = __DIR__ . '/../../logs/api-debug.log';
        $logMsg = date('Y-m-d H:i:s') . " [nest_posts.php] action=list, username=$username, userId=$userId, tag=" . ($tag ?: 'null') . ", limit=$limit, offset=$offset\n";
        file_put_contents($logFile, $logMsg, FILE_APPEND);

        // Build WHERE clause with optional tag filter
        $whereClause = 'user_id = :user_id';
        $params = [':user_id' => $userId];

        if ($tag) {
            $whereClause .= ' AND tag = :tag';
            $params[':tag'] = $tag;
        }

        // Get total count with filter
        $countSql = "SELECT COUNT(*) as total FROM nest_posts WHERE $whereClause";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // LOG: SQL and result
        file_put_contents($logFile, "  COUNT SQL: $countSql\n  Params: " . json_encode($params) . "\n  Total: $totalCount\n", FILE_APPEND);

        // Build query with optional limit
        $sql = "SELECT id, slug, title, content, position, tag, created_date, created_at, updated_at FROM nest_posts WHERE $whereClause ORDER BY position ASC";
        if ($limit !== null) {
            $sql .= ' LIMIT :limit OFFSET :offset';
        }

        // LOG: Main SQL
        file_put_contents($logFile, "  SELECT SQL: $sql\n", FILE_APPEND);

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        if ($limit !== null) {
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        }
        $stmt->execute();
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // LOG: Results
        file_put_contents($logFile, "  Found " . count($posts) . " posts\n", FILE_APPEND);
        if (count($posts) === 0 && $tag) {
            // If no posts found with tag, let's see what tags exist
            $allTagsStmt = $db->prepare("SELECT DISTINCT tag FROM nest_posts WHERE user_id = :user_id");
            $allTagsStmt->execute([':user_id' => $userId]);
            $allTags = $allTagsStmt->fetchAll(PDO::FETCH_COLUMN);
            file_put_contents($logFile, "  Available tags for user $userId: " . json_encode($allTags, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
        }

        echo json_encode([
            'success' => true,
            'posts' => $posts,
            'total' => $totalCount,
            'offset' => $offset,
            'limit' => $limit
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

        // created_date defaults to created_at, updated_at same as created_at on creation
        $stmt = $db->prepare('INSERT INTO nest_posts (user_id, slug, title, content, position, created_date, created_at, updated_at) VALUES (:user_id, :slug, :title, :content, :position, :created_date, :created_at, :updated_at)');
        $stmt->execute([':user_id' => $telegramUserId, ':slug' => $slug, ':title' => $title, ':content' => $content, ':position' => $position, ':created_date' => $now, ':created_at' => $now, ':updated_at' => $now]);

        echo json_encode(['success' => true, 'post' => ['id' => $db->lastInsertId(), 'slug' => $slug, 'title' => $title, 'content' => $content, 'position' => $position, 'created_date' => $now, 'created_at' => $now, 'updated_at' => $now]]);

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

        $stmt = $db->prepare('SELECT id, slug, title, content, tag FROM nest_posts WHERE id = :id AND user_id = :user_id');
        $stmt->execute([':id' => $postId, ':user_id' => $telegramUserId]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            echo json_encode(['success' => false, 'error' => 'Post not found']);
            exit;
        }

        // Track old tag for count updates
        $oldTag = $post['tag'] ?? null;

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

        // Update post counts if tag changed
        if ($tag !== null) {
            update_post_count_for_tag_change($db, $telegramUserId, $oldTag, $tag);
        }

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

        // Get tag before deleting for count update
        $stmt = $db->prepare('SELECT tag FROM nest_posts WHERE id = :id AND user_id = :user_id');
        $stmt->execute([':id' => $postId, ':user_id' => $telegramUserId]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $db->prepare('DELETE FROM nest_posts WHERE id = :id AND user_id = :user_id');
        $stmt->execute([':id' => $postId, ':user_id' => $telegramUserId]);

        $success = $stmt->rowCount() > 0;

        // Update post count if post had a tag
        if ($success && $post && $post['tag']) {
            decrement_post_count($db, $telegramUserId, $post['tag']);
        }

        echo json_encode(['success' => $success]);

    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
