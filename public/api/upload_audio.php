<?php
// public/api/upload_audio.php - API for uploading audio files
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

try {
    // Check authorization
    if (!isset($_SESSION['telegram_user']['user_id'])) {
        echo json_encode(['success' => 0, 'error' => 'Not authorized']);
        exit;
    }

    // Check if file was uploaded
    if (!isset($_FILES['audio'])) {
        echo json_encode(['success' => 0, 'error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['audio'];

    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => 0, 'error' => 'Upload error: ' . $file['error']]);
        exit;
    }

    // Validate file type (only audio files)
    $allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        echo json_encode(['success' => 0, 'error' => 'Invalid file type. Only MP3, WAV, OGG, and M4A are allowed.']);
        exit;
    }

    // Check file size (max 200MB)
    $maxSize = 200 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        echo json_encode(['success' => 0, 'error' => 'File too large. Maximum size is 200MB.']);
        exit;
    }

    // Use original filename (cleaned up)
    $originalName = pathinfo($file['name'], PATHINFO_FILENAME);
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);

    // Clean filename: remove special characters, keep only alphanumeric, spaces, hyphens, and underscores
    $cleanName = preg_replace('/[^a-zA-Z0-9\s\-_а-яА-ЯёЁ]/u', '', $originalName);
    $cleanName = preg_replace('/\s+/', ' ', $cleanName); // Replace multiple spaces with single space
    $cleanName = trim($cleanName);

    if (empty($cleanName)) {
        $cleanName = 'audio_' . time();
    }

    // Determine extension from MIME type if not present
    if (empty($extension)) {
        $extensions = [
            'audio/mpeg' => 'mp3',
            'audio/mp3' => 'mp3',
            'audio/wav' => 'wav',
            'audio/ogg' => 'ogg',
            'audio/mp4' => 'm4a',
            'audio/x-m4a' => 'm4a'
        ];
        $extension = $extensions[$mimeType] ?? 'mp3';
    }

    // Create filename
    $filename = $cleanName . '.' . $extension;

    // Upload to /collection/music/ directory (in root, outside pavilion)
    $uploadDir = __DIR__ . '/../../../collection/music/';
    // Normalize path
    $uploadDir = realpath($uploadDir);
    if ($uploadDir === false) {
        // If realpath fails, try to create the directory first
        $uploadDir = __DIR__ . '/../../../collection/music/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                echo json_encode(['success' => 0, 'error' => 'Failed to create directory: ' . $uploadDir]);
                exit;
            }
        }
        $uploadDir = realpath($uploadDir);
    }

    $uploadPath = $uploadDir . '/' . $filename;

    // Check if file already exists and add number suffix if needed
    $counter = 1;
    while (file_exists($uploadPath)) {
        $filename = $cleanName . '_' . $counter . '.' . $extension;
        $uploadPath = $uploadDir . '/' . $filename;
        $counter++;
    }

    // Move uploaded file with detailed error reporting
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        $phpError = error_get_last();
        $errorMsg = 'Failed to save file to: ' . $uploadPath;
        if ($phpError) {
            $errorMsg .= ' - PHP Error: ' . $phpError['message'];
        }
        if (!is_writable($uploadDir)) {
            $errorMsg .= ' - Directory not writable';
        }
        echo json_encode(['success' => 0, 'error' => $errorMsg]);
        exit;
    }

    // Try to extract metadata (artist, title) from filename
    // Format: "Artist - Track.mp3" or just "Track.mp3"
    $metadata = [
        'artist' => '',
        'track' => $cleanName
    ];

    if (strpos($cleanName, ' - ') !== false) {
        $parts = explode(' - ', $cleanName, 2);
        $metadata['artist'] = trim($parts[0]);
        $metadata['track'] = trim($parts[1]);
    }

    // Collection is in root, not in pavilion
    // So URL is always /collection/music/ without basePath

    // Return success response
    echo json_encode([
        'success' => 1,
        'file' => [
            'url' => '/collection/music/' . $filename,
            'name' => $file['name'],
            'size' => $file['size'],
            'artist' => $metadata['artist'],
            'track' => $metadata['track']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => 0,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
