<?php
// test-youtube.php - Test YouTube integration

require_once __DIR__ . '/server/YouTubePreviewService.php';

echo "=== YouTube Integration Test ===\n\n";

// Test 1: Check yt-dlp installation
echo "1. Checking yt-dlp installation...\n";
$version = shell_exec('yt-dlp --version 2>&1');
if ($version) {
    echo "   ✓ yt-dlp installed: " . trim($version) . "\n";
} else {
    echo "   ✗ yt-dlp NOT installed!\n";
    echo "   Install: pip3 install yt-dlp\n";
    exit(1);
}

echo "\n";

// Test 2: Parse YouTube URL
echo "2. Testing URL parsing...\n";
$testUrls = [
    'https://www.youtube.com/watch?v=QjbmmMHXavs',
    'https://youtu.be/QjbmmMHXavs?si=YZpYm42CyQE2VWxo',
    'https://youtube.com/watch?v=QjbmmMHXavs'
];

$service = new YouTubePreviewService();
$reflection = new ReflectionClass($service);
$parseMethod = $reflection->getMethod('parseYouTubeUrl');
$parseMethod->setAccessible(true);

foreach ($testUrls as $url) {
    $videoId = $parseMethod->invoke($service, $url);
    if ($videoId === 'QjbmmMHXavs') {
        echo "   ✓ Parsed: $url\n";
    } else {
        echo "   ✗ Failed: $url (got: $videoId)\n";
    }
}

echo "\n";

// Test 3: Fetch metadata
echo "3. Testing metadata fetching...\n";
$metadata = $service->enrichMessage('Check this out: https://youtu.be/QjbmmMHXavs');

if ($metadata) {
    echo "   ✓ Metadata fetched successfully!\n";
    echo "   Type: " . $metadata['type'] . "\n";
    echo "   Artist: " . $metadata['artist'] . "\n";
    echo "   Track: " . $metadata['track'] . "\n";
    echo "   Audio URL: " . $metadata['audioUrl'] . "\n";
    if (isset($metadata['duration'])) {
        echo "   Duration: " . $metadata['duration'] . "s\n";
    }
} else {
    echo "   ✗ Failed to fetch metadata\n";
    echo "   This might be due to:\n";
    echo "   - YouTube blocking requests\n";
    echo "   - yt-dlp needs updating\n";
    echo "   - Network issues\n";
}

echo "\n";

// Test 4: Test stream URL extraction
echo "4. Testing stream URL extraction...\n";
$streamUrl = shell_exec('yt-dlp -f bestaudio --get-url "https://www.youtube.com/watch?v=QjbmmMHXavs" 2>&1');
if ($streamUrl && filter_var(trim($streamUrl), FILTER_VALIDATE_URL)) {
    echo "   ✓ Stream URL extracted successfully\n";
    echo "   URL: " . substr(trim($streamUrl), 0, 80) . "...\n";
} else {
    echo "   ✗ Failed to extract stream URL\n";
    echo "   Output: $streamUrl\n";
}

echo "\n=== Test Complete ===\n";
