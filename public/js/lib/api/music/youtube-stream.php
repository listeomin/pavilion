<?php
// api/music/youtube-stream.php
// Returns direct audio stream URL for YouTube video

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_GET['v'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing video ID']);
    exit;
}

$videoId = $_GET['v'];

// Validate video ID format
if (!preg_match('/^[a-zA-Z0-9_-]{11}$/', $videoId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid video ID']);
    exit;
}

try {
    // Use yt-dlp to get direct audio stream URL
    // -f bestaudio: get best audio quality
    // --get-url: just return the URL, don't download
    // Add options to avoid rate limiting
    $command = sprintf(
        '/usr/local/bin/yt-dlp -f bestaudio --get-url --extractor-args "youtube:player_client=web" "https://www.youtube.com/watch?v=%s" 2>&1',
        escapeshellarg($videoId)
    );

    $streamUrl = shell_exec($command);

    if (!$streamUrl) {
        error_log('[YouTube Stream] Failed to get URL for: ' . $videoId);
        http_response_code(500);
        echo json_encode(['error' => 'Failed to extract stream URL']);
        exit;
    }

    $streamUrl = trim($streamUrl);

    // Check if it's a valid URL
    if (!filter_var($streamUrl, FILTER_VALIDATE_URL)) {
        error_log('[YouTube Stream] Invalid URL returned: ' . $streamUrl);
        http_response_code(500);
        echo json_encode(['error' => 'Invalid stream URL']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'streamUrl' => $streamUrl,
        'videoId' => $videoId
    ]);

} catch (Exception $e) {
    error_log('[YouTube Stream] Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
