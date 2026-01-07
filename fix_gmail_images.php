<?php
// remove_broken_images.php - Remove broken image references
require_once __DIR__ . '/server/db.php';

$db = get_db();

// Get user ID for listeomin
$stmt = $db->prepare('SELECT id FROM users WHERE telegram_username = :username LIMIT 1');
$stmt->execute([':username' => 'listeomin']);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("User 'listeomin' not found\n");
}

$userId = $user['id'];

// Get all posts with /uploads/images/gmail_ URLs
$stmt = $db->prepare('SELECT id, title, content FROM nest_posts WHERE user_id = :user_id AND content LIKE :pattern');
$stmt->execute([
    ':user_id' => $userId,
    ':pattern' => '%/uploads/images/gmail_%'
]);
$posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($posts) . " posts with broken image references\n\n";

foreach ($posts as $post) {
    echo "Processing post #{$post['id']}: {$post['title']}\n";

    $content = json_decode($post['content'], true);
    if (!$content) {
        echo "  ❌ Failed to parse JSON content\n\n";
        continue;
    }

    $modified = false;
    $processedContent = removeImageNodes($content, $modified);

    if ($modified) {
        // Update post with new content
        $newContentJson = json_encode($processedContent, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = $db->prepare('UPDATE nest_posts SET content = :content WHERE id = :id');
        $stmt->execute([
            ':content' => $newContentJson,
            ':id' => $post['id']
        ]);
        echo "  ✅ Removed broken images\n";
    } else {
        echo "  ℹ️  No changes needed\n";
    }

    echo "\n";
}

echo "Done! Please re-upload images manually through the nest interface.\n";

function removeImageNodes($node, &$modified) {
    if (!is_array($node)) {
        return $node;
    }

    // If this node has content array, filter out broken image nodes
    if (isset($node['content']) && is_array($node['content'])) {
        $newContent = [];
        foreach ($node['content'] as $child) {
            // Skip image nodes with broken URLs
            if (isset($child['type']) && $child['type'] === 'image' &&
                isset($child['attrs']['src']) &&
                strpos($child['attrs']['src'], '/uploads/images/gmail_') !== false) {
                $modified = true;
                echo "    Removing broken image: {$child['attrs']['src']}\n";
                continue; // Skip this node
            }

            // Recursively process child
            $newContent[] = removeImageNodes($child, $modified);
        }
        $node['content'] = $newContent;
    }

    return $node;
}
