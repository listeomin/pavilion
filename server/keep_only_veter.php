<?php
// Keep only "Ветер" article in nest_content
require_once __DIR__ . '/db.php';

$db = get_db();
$userId = 2; // listeomin

// Get current content
$stmt = $db->prepare('SELECT content FROM nest_content WHERE user_id = :user_id');
$stmt->execute([':user_id' => $userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    die("No content found for user_id $userId\n");
}

$content = $row['content'];
echo "Original content length: " . strlen($content) . " bytes\n";

// Decode JSON string
$decodedContent = json_decode($content);
if ($decodedContent === null) {
    die("Failed to decode JSON content\n");
}

echo "Decoded content length: " . strlen($decodedContent) . " bytes\n";

// Find first occurrence of "Ветер" article
$pattern = '/<h1>Ветер<\/h1>.*?(?=<h1>|$)/su';
preg_match($pattern, $decodedContent, $matches);

if (empty($matches)) {
    die("Article 'Ветер' not found\n");
}

$veterArticle = $matches[0];
echo "Found 'Ветер' article, length: " . strlen($veterArticle) . " bytes\n";

// Update database - keep only "Ветер"
$newContent = json_encode($veterArticle);

$stmt = $db->prepare('UPDATE nest_content SET content = :content, updated_at = datetime(\'now\') WHERE user_id = :user_id');
$stmt->execute([
    ':content' => $newContent,
    ':user_id' => $userId
]);

echo "Done! Updated nest_content to contain only 'Ветер' article\n";
