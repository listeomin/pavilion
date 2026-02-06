<?php
// branches/index.php - Branches (topics/threads) page

require_once dirname(__DIR__) . '/config.php';

// Configure session to last longer (30 days)
ini_set('session.gc_maxlifetime', 2592000); // 30 days in seconds
ini_set('session.cookie_lifetime', 2592000); // 30 days
session_start();

// Auto-detect BASE_PATH from request URI
function get_base_path() {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, '/pavilion/') === 0) {
        return '/pavilion';
    }
    return '';
}

$basePath = get_base_path();

// Parse URL to extract branch ID from /branches/{id}
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove base path and extract segments
$cleanPath = str_replace($basePath, '', $path);
$segments = array_filter(explode('/', $cleanPath));
$segments = array_values($segments); // Re-index array

// Check if we have /branches/{id} format
$branchId = null;
if (count($segments) >= 1 && $segments[0] === 'branches') {
    if (isset($segments[1]) && $segments[1] !== '' && is_numeric($segments[1])) {
        $branchId = $segments[1];
    }
}

// Check Telegram authorization
$telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;

// Get branch info if ID provided
$branchTitle = null;
if ($branchId) {
    require_once __DIR__ . '/../../server/db.php';
    $db = get_db();

    $stmt = $db->prepare('SELECT title FROM branches WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $branchId]);
    $branch = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($branch) {
        $branchTitle = $branch['title'];
    } else {
        // Branch not found - redirect to branches list
        header("Location: {$basePath}/branches");
        exit;
    }
}

?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<base href="<?php echo htmlspecialchars($basePath); ?>/">
<title><?php echo $branchTitle ? htmlspecialchars($branchTitle) : 'Ветки'; ?></title>
<script>
  // Pass PHP variables to JavaScript
  window.BRANCH_CONFIG = {
    currentUserId: <?php echo $telegramUserId ? json_encode($telegramUserId) : 'null'; ?>,
    branchId: <?php echo $branchId ? json_encode($branchId) : 'null'; ?>,
    branchTitle: <?php echo $branchTitle ? json_encode($branchTitle) : 'null'; ?>
  };
</script>
<link rel="icon" href="assets/favicon.png" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&family=Ubuntu+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/base.css?v=9">
<link rel="stylesheet" href="css/chat.css?v=6">
<link rel="stylesheet" href="css/input.css?v=9">
<link rel="stylesheet" href="css/format-menu.css?v=4">
<link rel="stylesheet" href="css/colors.css?v=1">
<link rel="stylesheet" href="css/inline-input.css?v=3">
<link rel="stylesheet" href="css/music.css?v=1">
<link rel="stylesheet" href="css/track-preview.css?v=1">
<link rel="stylesheet" href="css/audio-player.css?v=1">
<link rel="stylesheet" href="css/nightshift.css?v=1">
<link rel="stylesheet" href="css/animalProfile.css?v=18">
<link rel="stylesheet" href="css/contextMenu.css?v=3">
<link rel="stylesheet" href="css/telegramAuth.css?v=1">
<link rel="stylesheet" href="css/navigation.css?v=6">
<link rel="stylesheet" href="css/skeleton.css?v=3">
<link rel="stylesheet" href="css/empty-state.css?v=1">
<link rel="stylesheet" href="css/weather.css?v=1">
<link rel="stylesheet" href="css/branches.css?v=6">
<link rel="stylesheet" href="css/image-zoom.css?v=2">
<link rel="stylesheet" href="css/mobile.css?v=3">
</head>
<body class="page-branches<?php if ($branchId) echo ' has-chat'; ?>">
<?php include_partial('main-nav.php', ['active' => 'branches']); ?>

<div class="wrap">
  <div id="header-container">
    <?php include_partial('user-header.php'); ?>
    <h1>Ветки</h1>
  </div>
  <?php if ($branchId): ?>
    <!-- Chat area when branch is selected -->
    <div class="branch-chat-container">
      <div class="branch-chat-header">
        <span class="branch-title"><?php echo htmlspecialchars($branchTitle); ?></span>
      </div>

      <!-- Messages container -->
      <div id="branch-messages" class="branch-messages"></div>

      <!-- Input area -->
      <div class="branch-input-wrapper">
        <form id="branch-send-form" class="branch-send-form">
          <div id="branch-input" class="branch-input" contenteditable="true" data-placeholder="Написать сообщение..."></div>
          <button type="submit" id="branch-send-paw-btn" class="branch-send-paw-btn">
            <img src="assets/send-paw.png" alt="Отправить">
          </button>
        </form>
      </div>
    </div>
  <?php else: ?>
    <!-- Empty state - no branch selected -->
    <div class="empty-state">
      <img src="assets/empty-brnch.png" alt="Пусто">
      <div class="empty-state-text">Выберите ветку из списка справа</div>
    </div>
  <?php endif; ?>
</div>

<!-- Background image - shows when branch is active -->
<img src="assets/branches.png" alt="" class="branch-background-bird" style="display: <?php echo $branchId ? 'block' : 'none'; ?>;">

<!-- Branches list (right) - always visible -->
<div class="branches-sidebar">
  <div class="branches-header-row">
    <nav class="branches-nav">
      <a href="#" class="branch-nav-item active" data-filter="all">Все</a>
      <span class="branch-nav-separator">|</span>
      <a href="#" class="branch-nav-item" data-filter="my">Мои</a>
      <span class="branch-nav-separator">|</span>
      <a href="#" class="branch-nav-item" data-filter="hidden">Скрытые</a>
    </nav>
  </div>
  <div id="branches-list" class="branches-list"></div>
</div>

<!-- Context menu for branch items -->
<div id="branch-context-menu" class="branch-context-menu" style="display: none;">
  <div class="branch-context-menu-item" data-action="hide">Спрятать</div>
  <div class="branch-context-menu-item" data-action="delete">Удалить</div>
</div>
<?php include_partial('utility-buttons.php'); ?>
<script type="module" src="js/branches.js?v=6"></script>
</body>
</html>
