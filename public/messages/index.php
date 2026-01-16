<?php
// messages/index.php - Direct messages between users

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

// Parse URL to extract username from /messages/{username}
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove base path and extract segments
$cleanPath = str_replace($basePath, '', $path);
$segments = array_filter(explode('/', $cleanPath));
$segments = array_values($segments); // Re-index array

// Check if we have /messages/{username} format
$recipientUsername = null;
if (count($segments) >= 1 && $segments[0] === 'messages') {
    if (isset($segments[1]) && $segments[1] !== '') {
        $recipientUsername = $segments[1];
    }
}

// Check Telegram authorization
$telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;
$telegramUsername = $_SESSION['telegram_user']['telegram_username'] ?? null;
$telegramFirstName = $_SESSION['telegram_user']['first_name'] ?? null;

// Show simple list page for unauthorized users (like branches.php)
if (!$telegramUserId && !$recipientUsername) {
    // Show simple messages list page (like branches.php)
    ?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<base href="<?php echo htmlspecialchars($basePath); ?>/">
<title>Послания</title>
<link rel="icon" href="assets/favicon.png" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&family=Ubuntu+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/base.css?v=8">
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
<link rel="stylesheet" href="css/navigation.css?v=6">
<link rel="stylesheet" href="css/empty-state.css?v=1">
<link rel="stylesheet" href="css/skeleton.css?v=3">
<link rel="stylesheet" href="css/weather.css?v=1">
<link rel="stylesheet" href="css/dev-nest.css?v=2">
</head>
<body class="page-chat skeleton-active">
<?php include_partial('main-nav.php', ['active' => 'messages']); ?>
<div class="wrap">
  <div id="header-container">
    <div id="user-header">
      <span id="user-emoji" class="user-emoji-clickable"></span>
      <span id="user-label-header">– это вы!</span>
    </div>
    <h1>Послания</h1>
  </div>
  <div id="skeleton-ui" class="skeleton-container">
    <div class="skeleton-header">
      <div class="skeleton skeleton-user-header"></div>
      <div class="skeleton skeleton-title"></div>
    </div>
    <div class="skeleton skeleton-chat-area"></div>
  </div>
  <div class="empty-state">
    <img src="assets/empty-msg.png" alt="Пусто">
    <div class="empty-state-text">Здесь пока пусто</div>
  </div>
</div>
<div id="telegram-auth-container"></div>
<?php include_partial('utility-buttons.php'); ?>
<script type="module" src="js/messages.js?v=5"></script>
</body>
</html>
<?php
    exit;
}

// Redirect to nest if not authorized AND trying to access a specific conversation
if (!$telegramUserId && $recipientUsername) {
    header("Location: {$basePath}/nest");
    exit;
}

// Get recipient user info if username provided
$recipientUserId = null;
$recipientFirstName = null;
$recipientEmoji = null;

if ($recipientUsername) {
    require_once __DIR__ . '/../../server/db.php';
    $db = get_db();

    // Find recipient by username OR telegram_id
    if (is_numeric($recipientUsername)) {
        // It's a telegram_id
        $stmt = $db->prepare('SELECT u.id, u.telegram_first_name, u.telegram_username
                              FROM users u
                              WHERE u.telegram_id = :telegram_id
                              LIMIT 1');
        $stmt->execute([':telegram_id' => $recipientUsername]);
        $recipient = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        // It's a username
        $stmt = $db->prepare('SELECT u.id, u.telegram_first_name, u.telegram_username
                              FROM users u
                              WHERE u.telegram_username = :username
                              LIMIT 1');
        $stmt->execute([':username' => $recipientUsername]);
        $recipient = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get emoji from animal_profiles (separate DB)
    if ($recipient) {
        try {
            $animalDb = new PDO('sqlite:' . __DIR__ . '/../data/animal.sqlite');
            $animalDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            $stmt = $animalDb->prepare('SELECT emoji FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
            $stmt->execute([':user_id' => $recipient['id']]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            $recipient['emoji'] = $profile ? $profile['emoji'] : '👤';
        } catch (Exception $e) {
            $recipient['emoji'] = '👤';
        }
    }

    if ($recipient) {
        $recipientUserId = $recipient['id'];
        $recipientFirstName = $recipient['telegram_first_name'];
        $recipientEmoji = $recipient['emoji'] ?? '👤';
    } else {
        // Recipient not found - redirect to messages list
        header("Location: {$basePath}/messages");
        exit;
    }
}

// Don't allow messaging yourself
if ($recipientUserId && $recipientUserId == $telegramUserId) {
    header("Location: {$basePath}/messages");
    exit;
}

?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<base href="<?php echo htmlspecialchars($basePath); ?>/">
<title><?php
  if ($recipientFirstName) {
    echo "Послания с {$recipientEmoji} {$recipientFirstName}";
  } else {
    echo "Послания";
  }
?></title>
<script>
  // Pass PHP variables to JavaScript
  window.DM_CONFIG = {
    currentUserId: <?php echo $telegramUserId ? json_encode($telegramUserId) : 'null'; ?>,
    currentUsername: <?php echo $telegramUsername ? json_encode($telegramUsername) : 'null'; ?>,
    recipientUsername: <?php echo $recipientUsername ? json_encode($recipientUsername) : 'null'; ?>,
    recipientUserId: <?php echo $recipientUserId ? json_encode($recipientUserId) : 'null'; ?>,
    recipientFirstName: <?php echo $recipientFirstName ? json_encode($recipientFirstName) : 'null'; ?>,
    recipientEmoji: <?php echo $recipientEmoji ? json_encode($recipientEmoji) : 'null'; ?>
  };
</script>
<link rel="icon" href="assets/favicon.png" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&family=Ubuntu+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/base.css?v=8">
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
<link rel="stylesheet" href="css/navigation.css?v=6">
<link rel="stylesheet" href="css/skeleton.css?v=3">
<link rel="stylesheet" href="css/empty-state.css?v=1">
<link rel="stylesheet" href="css/weather.css?v=1">
<link rel="stylesheet" href="css/dm.css?v=25">
<link rel="stylesheet" href="css/image-zoom.css?v=2">
</head>
<body class="page-dm<?php if ($recipientUsername) echo ' has-chat'; ?>">
<img src="assets/bird.png" alt="" class="dm-background-bird" style="display: <?php echo $recipientUsername ? 'block' : 'none'; ?>;">
<?php include_partial('main-nav.php', ['active' => 'messages']); ?>

<div class="wrap">
  <div id="header-container">
    <div id="user-header">
      <span id="user-emoji" class="user-emoji-clickable"></span>
      <span id="user-label-header">– это вы!</span>
    </div>
    <h1>Послания</h1>
  </div>

  <?php if ($recipientUsername): ?>
    <!-- Chat area when user is selected -->
    <div class="dm-chat-container">
      <div class="dm-chat-header">
        <span class="dm-recipient-emoji"><?php echo htmlspecialchars($recipientEmoji); ?></span>
        <span class="dm-recipient-name"><?php echo htmlspecialchars($recipientFirstName); ?></span>
      </div>

      <!-- Messages container -->
      <div id="dm-messages" class="dm-messages"></div>

      <!-- Input area -->
      <div class="dm-input-wrapper">
        <form id="dm-send-form" class="dm-send-form">
          <div id="dm-input" class="dm-input" contenteditable="true" data-placeholder="Написать послание..."></div>
          <button type="submit" id="dm-send-paw-btn" class="dm-send-paw-btn">
            <img src="assets/send-paw.png" alt="Отправить">
          </button>
        </form>
      </div>
    </div>
  <?php else: ?>
    <!-- Empty state - no chat selected -->
    <div class="empty-state">
      <img src="assets/empty-msg.png" alt="Пусто">
      <div class="empty-state-text">Выберите пользователя из списка справа</div>
    </div>
  <?php endif; ?>
</div>

<!-- User list (right) - always visible -->
<div class="dm-users-sidebar">
  <div class="dm-users-header-row">
    <nav class="dm-users-nav">
      <a href="#" class="dm-nav-item active" data-filter="all">Все</a>
      <span class="dm-nav-separator">|</span>
      <a href="#" class="dm-nav-item" data-filter="pack">Стая</a>
      <span class="dm-nav-separator">|</span>
      <a href="#" class="dm-nav-item" data-filter="residents">Жители</a>
    </nav>
    <button id="dm-hidden-btn" class="dm-hidden-btn">Скрытые</button>
  </div>
  <div id="dm-users-list" class="dm-users-list"></div>
</div>

<!-- Context menu for user items -->
<div id="dm-user-context-menu" class="dm-user-context-menu" style="display: none;">
  <div class="dm-context-menu-item" data-action="add-to-pack">В Стаю</div>
  <div class="dm-context-menu-item" data-action="goto-nest">Гнездо</div>
  <div class="dm-context-menu-item" data-action="hide">Спрятать</div>
</div>
<?php include_partial('utility-buttons.php'); ?>
<script type="module" src="js/dm.js?v=15"></script>
</body>
</html>
