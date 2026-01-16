<?php
// public/api/upload_image.php - API for uploading images for Editor.js
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
    if (!isset($_FILES['image'])) {
        echo json_encode(['success' => 0, 'error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['image'];

    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => 0, 'error' => 'Upload error: ' . $file['error']]);
        exit;
    }

    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        echo json_encode(['success' => 0, 'error' => 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.']);
        exit;
    }

    // Check file size (max 100MB)
    $maxSize = 100 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        echo json_encode(['success' => 0, 'error' => 'File too large. Maximum size is 100MB.']);
        exit;
    }

    // Generate UUID for filename
    $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    // Get file extension
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    if (empty($extension)) {
        // Determine extension from MIME type
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp'
        ];
        $extension = $extensions[$mimeType] ?? 'png';
    }

    // Create filename
    $filename = $uuid . '.' . $extension;
    $uploadDir = __DIR__ . '/../assets/images/';
    $uploadPath = $uploadDir . $filename;

    // Ensure directory exists
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        echo json_encode(['success' => 0, 'error' => 'Failed to save file']);
        exit;
    }

    // Auto-detect BASE_PATH from request URI
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $basePath = '';
    if (strpos($uri, '/pavilion/') === 0) {
        $basePath = '/pavilion';
    }

    // Return success response in Editor.js format
    echo json_encode([
        'success' => 1,
        'file' => [
            'url' => $basePath . '/assets/images/' . $filename,
            'name' => $file['name'],
            'size' => $file['size']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => 0,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
