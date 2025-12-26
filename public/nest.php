<?php
// nest.php

// Auto-detect BASE_PATH from request URI
function get_base_path() {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, '/pavilion/') === 0) {
        return '/pavilion';
    }
    return '';
}

$basePath = get_base_path();

// Parse URL to extract user_id from /nest/{user_id}
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove base path and extract segments
$cleanPath = str_replace($basePath, '', $path);
$segments = array_filter(explode('/', $cleanPath));
$segments = array_values($segments); // Re-index array

// Check if we have /nest/{user_id} format
$urlUserId = null;
if (count($segments) >= 2 && $segments[0] === 'nest') {
    $urlUserId = $segments[1];
}

// Check Telegram authorization
session_start();
$telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;

// Logic for redirects:
// 1. If authorized user visits /nest → redirect to /nest/{user_id}
// 2. If not authorized user visits /nest/{user_id} → redirect to /nest
if ($telegramUserId && !$urlUserId) {
    // Authorized user on /nest → redirect to personal page
    header("Location: {$basePath}/nest/{$telegramUserId}");
    exit;
} elseif (!$telegramUserId && $urlUserId) {
    // Not authorized user trying to access /nest/{user_id} → redirect to /nest
    header("Location: {$basePath}/nest");
    exit;
}

// If user is on their own page - good!
// If user is on someone else's page - also ok (read-only access)
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<base href="<?php echo htmlspecialchars($basePath); ?>/">
<title><?php echo $urlUserId ? "Гнездо #{$urlUserId}" : "Гнездо"; ?></title>
<script>
  // Pass PHP variables to JavaScript
  window.NEST_CONFIG = {
    urlUserId: <?php echo $urlUserId ? json_encode($urlUserId) : 'null'; ?>,
    telegramUserId: <?php echo $telegramUserId ? json_encode($telegramUserId) : 'null'; ?>,
    isOwnNest: <?php echo ($telegramUserId && $urlUserId && $telegramUserId == $urlUserId) ? 'true' : 'false'; ?>
  };
</script>
<link rel="icon" href="assets/favicon.png" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&family=Ubuntu+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/base.css?v=4">
<link rel="stylesheet" href="css/chat.css?v=5">
<link rel="stylesheet" href="css/input.css?v=7">
<link rel="stylesheet" href="css/format-menu.css?v=4">
<link rel="stylesheet" href="css/colors.css?v=1">
<link rel="stylesheet" href="css/inline-input.css?v=3">
<link rel="stylesheet" href="css/music.css?v=1">
<link rel="stylesheet" href="css/track-preview.css?v=1">
<link rel="stylesheet" href="css/audio-player.css?v=1">
<link rel="stylesheet" href="css/nightshift.css?v=1">
<link rel="stylesheet" href="css/animalProfile.css?v=17">
<link rel="stylesheet" href="css/contextMenu.css?v=1">
<link rel="stylesheet" href="css/telegramAuth.css?v=1">
<link rel="stylesheet" href="css/navigation.css?v=2">
<link rel="stylesheet" href="css/jp-window.css?v=1">
<link rel="stylesheet" href="css/nest.css?v=1">
</head>
<body>
<nav class="main-nav">
  <a href="./" class="nav-item">Мурмурация</a>
  <span class="nav-separator">|</span>
  <a href="branches" class="nav-item">Ветки</a>
  <span class="nav-separator">|</span>
  <a href="messages" class="nav-item">Послания</a>
  <span class="nav-separator">|</span>
  <a href="nest" class="nav-item active">Гнездо</a>
</nav>
<div class="wrap">
  <div id="header-container">
    <div id="user-header">
      <span id="user-emoji" class="user-emoji-clickable"></span>
      <span id="user-label-header">– это вы!</span>
    </div>
    <h1>Гнездо</h1>
  </div>
  <div class="nest-description">
    <?php if ($urlUserId): ?>
      <p>Гнездо пользователя #<?php echo htmlspecialchars($urlUserId); ?></p>
      <?php if ($telegramUserId && $telegramUserId == $urlUserId): ?>
        <p style="opacity: 0.6; font-size: 14px;">Это ваше личное пространство</p>
      <?php else: ?>
        <p style="opacity: 0.6; font-size: 14px;">Вы в гостях</p>
      <?php endif; ?>
    <?php else: ?>
      <p>Твоя стая.</p>
      <p>Твои правила!</p>
      <p>Только настоящий зверь может обрести здесь свой угол.</p>
      <p>Взлетай через Telegram — оживи уголок, где только твой зверь свободен.</p>
    <?php endif; ?>
  </div>
  <div id="telegram-auth-container"></div>
</div>
<button id="animal-profile-btn" class="animal-profile-trigger" title="Звериный профиль">
  <img src="assets/paw.svg" alt="Animal Profile">
</button>
<button id="nightshift-toggle">
  <img src="assets/moon.svg" alt="Night Shift">
</button>
<img src="assets/jp.png" id="jp-window" alt="Juni Perus Window">
<img src="assets/owl.png" id="owl-image" alt="Owl">
<script type="module" src="js/nest.js?v=2"></script>
</body>
</html>
