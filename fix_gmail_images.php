<?php
// fix_gmail_images.php - Fix Gmail proxy image URLs in nest posts
// This script downloads images from Gmail proxy URLs and saves them locally

require_once __DIR__ . '/server/db.php';

$db = get_db();
$uploadDir = __DIR__ . '/public/uploads/images';

// Ensure upload directory exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Get user ID for listeomin
$stmt = $db->prepare('SELECT id FROM users WHERE telegram_username = :username LIMIT 1');
$stmt->execute([':username' => 'listeomin']);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("User 'listeomin' not found\n");
}

$userId = $user['id'];

// Get all posts with Gmail proxy URLs
$stmt = $db->prepare('SELECT id, title, content FROM nest_posts WHERE user_id = :user_id AND content LIKE :pattern');
$stmt->execute([
    ':user_id' => $userId,
    ':pattern' => '%mail.google.com%'
]);
$posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($posts) . " posts with Gmail proxy URLs\n\n";

foreach ($posts as $post) {
    echo "Processing post #{$post['id']}: {$post['title']}\n";

    $content = json_decode($post['content'], true);
    if (!$content) {
        echo "  ❌ Failed to parse JSON content\n\n";
        continue;
    }

    $modified = false;
    $processedContent = processContent($content, $uploadDir, $modified);

    if ($modified) {
        // Update post with new content
        $newContentJson = json_encode($processedContent, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = $db->prepare('UPDATE nest_posts SET content = :content WHERE id = :id');
        $stmt->execute([
            ':content' => $newContentJson,
            ':id' => $post['id']
        ]);
        echo "  ✅ Updated post content\n";
    } else {
        echo "  ℹ️  No changes needed\n";
    }

    echo "\n";
}

echo "Done!\n";

function processContent($node, $uploadDir, &$modified) {
    if (!is_array($node)) {
        return $node;
    }

    // Check if this is an image node with Gmail URL
    if (isset($node['type']) && $node['type'] === 'image') {
        if (isset($node['attrs']['src']) && strpos($node['attrs']['src'], 'mail.google.com') !== false) {
            $gmailUrl = $node['attrs']['src'];
            echo "    Found Gmail URL: " . substr($gmailUrl, 0, 80) . "...\n";

            // Try to download the image
            $newUrl = downloadAndSaveImage($gmailUrl, $uploadDir);

            if ($newUrl) {
                $node['attrs']['src'] = $newUrl;
                $modified = true;
                echo "    ✅ Replaced with: $newUrl\n";
            } else {
                echo "    ⚠️  Failed to download image, keeping original URL\n";
            }
        }
    }

    // Recursively process children
    if (isset($node['content']) && is_array($node['content'])) {
        foreach ($node['content'] as $i => $child) {
            $node['content'][$i] = processContent($child, $uploadDir, $modified);
        }
    }

    return $node;
}

function downloadAndSaveImage($url, $uploadDir) {
    // Initialize cURL
    $ch = curl_init($url);

    // Try to use cookies from the browser if available
    $cookieFile = __DIR__ . '/gmail_cookies.txt';

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_TIMEOUT => 30,
    ]);

    // If cookie file exists, use it
    if (file_exists($cookieFile)) {
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieFile);
    }

    $imageData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

    if ($httpCode !== 200 || !$imageData) {
        return null;
    }

    // Determine file extension from content type
    $extension = 'jpg';
    if (strpos($contentType, 'png') !== false) {
        $extension = 'png';
    } elseif (strpos($contentType, 'gif') !== false) {
        $extension = 'gif';
    } elseif (strpos($contentType, 'webp') !== false) {
        $extension = 'webp';
    }

    // Generate unique filename
    $filename = 'gmail_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $filepath = $uploadDir . '/' . $filename;

    // Save image
    if (file_put_contents($filepath, $imageData)) {
        // Return relative URL for the web
        return '/uploads/images/' . $filename;
    }

    return null;
}
