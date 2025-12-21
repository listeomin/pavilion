<?php
// public/api/telegram_auth.php - сохраняем сессию, без проверки hash
session_start(); // ← обязательно для сессии

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($action === 'check') {
    if (isset($_SESSION['telegram_user'])) {
        echo json_encode([
            'success' => true,
            'data' => $_SESSION['telegram_user']
        ]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}

if ($action === 'logout') {
    unset($_SESSION['telegram_user']);
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'auth') {
    $data = json_decode(file_get_contents('php://input'), true);

    // Сохраняем данные в сессию (без проверки hash)
    $_SESSION['telegram_user'] = [
        'telegram_id' => $data['id'],
        'telegram_username' => $data['username'] ?? '',
        'telegram_first_name' => $data['first_name'] ?? '',
        'telegram_photo_url' => $data['photo_url'] ?? ''
    ];

    echo json_encode([
        'success' => true,
        'data' => $_SESSION['telegram_user']
    ]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid action']);