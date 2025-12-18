<?php
// server/ImageUploadService.php

require_once __DIR__ . '/config.php';

class ImageUploadService {
    private $uploadDir;
    private $allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];
    private $maxFileSize = 10 * 1024 * 1024; // 10MB

    public function __construct() {
        $this->uploadDir = __DIR__ . '/../public/assets/images/';
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }

    public function upload($file) {
        // Validate file exists
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return ['success' => false, 'error' => 'No file uploaded'];
        }

        // Validate file size
        if ($file['size'] > $this->maxFileSize) {
            return ['success' => false, 'error' => 'File too large (max 10MB)'];
        }

        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $this->allowedMimeTypes)) {
            return ['success' => false, 'error' => 'Invalid file type'];
        }

        // Get extension from MIME type
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp'
        ];
        $extension = $extensions[$mimeType] ?? 'jpg';

        // Generate UUID
        $uuid = $this->generateUUID();
        $filename = $uuid . '.' . $extension;
        $filepath = $this->uploadDir . $filename;

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            return ['success' => false, 'error' => 'Failed to save file'];
        }

        $basePath = get_base_path();
        
        return [
            'success' => true,
            'id' => $uuid,
            'url' => $basePath . '/assets/images/' . $filename
        ];
    }

    public function delete($id) {
        // Security: validate UUID format
        if (!preg_match('/^[a-f0-9\-]{36}$/i', $id)) {
            return ['success' => false, 'error' => 'Invalid ID'];
        }

        // Find file with this UUID (any extension)
        $pattern = $this->uploadDir . $id . '.*';
        $files = glob($pattern);

        if (empty($files)) {
            return ['success' => false, 'error' => 'File not found'];
        }

        foreach ($files as $file) {
            if (!unlink($file)) {
                return ['success' => false, 'error' => 'Failed to delete file'];
            }
        }

        return ['success' => true];
    }

    private function generateUUID() {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
