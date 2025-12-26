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
// Now we're in /nest/index.php, so URL is /nest/ or /nest/{user_id}
$urlUserId = null;
if (count($segments) >= 1 && $segments[0] === 'nest') {
    // If there's a second segment, it's the user_id
    if (isset($segments[1]) && $segments[1] !== '') {
        $urlUserId = $segments[1];
    }
}

// Check Telegram authorization
session_start();
$telegramUserId = $_SESSION['telegram_user']['user_id'] ?? null;
$telegramUsername = $_SESSION['telegram_user']['telegram_username'] ?? null;
$telegramUserTelegramId = $_SESSION['telegram_user']['telegram_id'] ?? null;

// Now $urlUserId contains either user_id OR telegram_username from URL
// We need to determine if it's a username or user_id and get the actual user_id
$urlUsername = $urlUserId; // Rename for clarity - this is from URL, could be username
$actualUserId = null;
$profileOwnerUsername = null;
$profileOwnerName = null;
$profileOwnerFirstName = null;
$profileOwnerEmoji = null;

if ($urlUsername) {
    // Try to find user by username or telegram_id
    require_once __DIR__ . '/../../server/db.php';
    $db = get_db();

    // First check if URL param is a username (has letters) or pure numeric telegram_id
    if (!is_numeric($urlUsername)) {
        // It's a username - find users.id by username
        $stmt = $db->prepare('SELECT id, telegram_id, telegram_first_name FROM users WHERE telegram_username = :username LIMIT 1');
        $stmt->execute([':username' => $urlUsername]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $actualUserId = $user['id']; // users.id, not telegram_id
            $profileOwnerUsername = $urlUsername;
            $profileOwnerFirstName = $user['telegram_first_name'];
        }
    } else {
        // It's a numeric telegram_id - get username and users.id
        $stmt = $db->prepare('SELECT id, telegram_username, telegram_first_name FROM users WHERE telegram_id = :telegram_id LIMIT 1');
        $stmt->execute([':telegram_id' => $urlUsername]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $actualUserId = $user['id']; // users.id, not telegram_id
            $profileOwnerUsername = $user['telegram_username'];
            $profileOwnerFirstName = $user['telegram_first_name'];

            // Redirect from /nest/{telegram_id} to /nest/{username}
            if ($profileOwnerUsername) {
                header("Location: {$basePath}/nest/{$profileOwnerUsername}");
                exit;
            }
        }
    }

    // If user found, try to get their animal profile
    if ($actualUserId) {
        // Get animal profile directly from animal.sqlite using user_id
        $animalDb = new PDO('sqlite:' . __DIR__ . '/../data/animal.sqlite');
        $animalDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $stmt = $animalDb->prepare('SELECT emoji, kind FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
        $stmt->execute([':user_id' => $actualUserId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($profile) {
            $profileOwnerName = $profile['emoji'] . ' ' . $profile['kind'];
            $profileOwnerEmoji = $profile['emoji'];
        } else {
            // Fallback to sessions.name if no animal profile
            $stmt = $db->prepare('SELECT name FROM sessions WHERE user_id = :user_id LIMIT 1');
            $stmt->execute([':user_id' => $actualUserId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($session && $session['name']) {
                $profileOwnerName = $session['name'];
                // Extract emoji (first part before space)
                $parts = explode(' ', $session['name'], 2);
                $profileOwnerEmoji = $parts[0]; // emoji is first part
            } else {
                $profileOwnerName = "Зверь @{$profileOwnerUsername}";
                $profileOwnerEmoji = null;
            }
        }
    }
}

// Logic for redirects:
// If authorized user visits /nest → redirect to /nest/{username} or /nest/{telegram_id}
if ($telegramUserId && !$urlUsername) {
    // Authorized user on /nest → redirect to personal page using USERNAME
    if ($telegramUsername) {
        header("Location: {$basePath}/nest/{$telegramUsername}");
    } else {
        // Fallback to telegram_id if no username
        header("Location: {$basePath}/nest/{$telegramUserTelegramId}");
    }
    exit;
}

// Check if this is user's own page
$isOwnNest = false;
if ($telegramUserId && $urlUsername) {
    // Check by username OR by telegram_id
    $isOwnNest = ($telegramUsername && $telegramUsername == $urlUsername)
              || (!$telegramUsername && $urlUsername == $telegramUserTelegramId);
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
<title><?php
  if ($profileOwnerFirstName) {
    echo $profileOwnerEmoji ? "Гнездо {$profileOwnerEmoji} {$profileOwnerFirstName}" : "Гнездо {$profileOwnerFirstName}";
  } else {
    echo "Гнездо";
  }
?></title>
<script>
  // Pass PHP variables to JavaScript
  window.NEST_CONFIG = {
    urlUsername: <?php echo $urlUsername ? json_encode($urlUsername) : 'null'; ?>,
    profileOwnerName: <?php echo $profileOwnerName ? json_encode($profileOwnerName) : 'null'; ?>,
    telegramUserId: <?php echo $telegramUserId ? json_encode($telegramUserId) : 'null'; ?>,
    telegramUsername: <?php echo $telegramUsername ? json_encode($telegramUsername) : 'null'; ?>,
    isOwnNest: <?php echo $isOwnNest ? 'true' : 'false'; ?>
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
<link rel="stylesheet" href="css/nest.css?v=13">
<!-- Editor.js -->
<link href="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@latest/dist/editorjs.min.css" rel="stylesheet">
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
    <?php if (!$urlUsername): ?>
    <div id="user-header">
      <span id="user-emoji" class="user-emoji-clickable"></span>
      <span id="user-label-header">– это вы!</span>
    </div>
    <?php endif; ?>
    <h1><?php
      if ($profileOwnerFirstName) {
        echo $profileOwnerEmoji ? htmlspecialchars($profileOwnerEmoji) . ' ' . htmlspecialchars($profileOwnerFirstName) : htmlspecialchars($profileOwnerFirstName);
      } else {
        echo 'Гнездо';
      }
    ?></h1>
  </div>
  <?php if (!$urlUsername): ?>
  <div class="nest-description">
    <p>Твоя стая.</p>
    <p>Твои правила!</p>
    <p>Только настоящий зверь может обрести здесь свой угол.</p>
    <p>Взлетай через Telegram — оживи уголок, где только твой зверь свободен.</p>
  </div>
  <?php endif; ?>

  <?php if ($urlUsername && !$isOwnNest): ?>
  <div class="nest-description">
    <p style="font-style: italic; color: var(--color-nimbus-dark);">Рад встрече!</p>
    <p style="font-style: italic; color: var(--color-nimbus-dark);">Что ты думаешь обо мне?</p>
  </div>
  <?php endif; ?>
  <?php if (!$isOwnNest): ?>
  <div id="telegram-auth-container"></div>
  <?php endif; ?>

  <?php if ($urlUsername): ?>
  <!-- Content editor (only on personal pages) -->
  <div id="nest-editor-container">
    <div id="nest-editor"></div>
  </div>
  <?php endif; ?>
</div>
<button id="animal-profile-btn" class="animal-profile-trigger" title="Звериный профиль">
  <img src="assets/paw.svg" alt="Animal Profile">
</button>
<button id="nightshift-toggle">
  <img src="assets/moon.svg" alt="Night Shift">
</button>
<?php if (!$urlUsername): ?>
<img src="assets/jp.png" id="jp-window" alt="Juni Perus Window">
<img src="assets/owl.png" id="owl-image" alt="Owl">
<?php endif; ?>
<!-- Editor.js Core -->
<script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.28.2/dist/editorjs.umd.min.js"></script>
<!-- Editor.js Plugins -->
<script src="https://cdn.jsdelivr.net/npm/@editorjs/header@2.7.0/dist/bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/list@1.8.0/dist/bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/quote@2.5.0/dist/bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.3.0/dist/bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/inline-code@1.4.0/dist/bundle.js"></script>
<script type="module" src="js/nest.js?v=10"></script>
</body>
</html>
