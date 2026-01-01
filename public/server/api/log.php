<?php
// log.php - Accept logs from frontend and write to file

header('Content-Type: application/json');

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$logDir = $_SERVER['DOCUMENT_ROOT'] . '/../logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/navigation.log';
$timestamp = date('Y-m-d H:i:s');
$message = $data['message'];
$level = $data['level'] ?? 'INFO';

$logEntry = "[$timestamp] [$level] $message\n";

file_put_contents($logFile, $logEntry, FILE_APPEND);

echo json_encode(['success' => true]);
