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

// Check if we have /nest/{user_id} or /nest/{user_id}/{post_slug} format
// Now we're in /nest/index.php, so URL is /nest/ or /nest/{user_id} or /nest/{user_id}/{slug}
$urlUserId = null;
$postSlug = null;
if (count($segments) >= 1 && $segments[0] === 'nest') {
    // If there's a second segment, it's the user_id
    if (isset($segments[1]) && $segments[1] !== '') {
        $urlUserId = $segments[1];
    }
    // If there's a third segment, it's the post slug
    if (isset($segments[2]) && $segments[2] !== '') {
        $postSlug = $segments[2];
    }
}

// Check Telegram authorization
// Configure session to last longer (30 days)
ini_set('session.gc_maxlifetime', 2592000); // 30 days in seconds
ini_set('session.cookie_lifetime', 2592000); // 30 days
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

// Load nest content for SEO/Instant View (if viewing someone's nest)
$nestContentHtml = '';
$nestContentText = '';
if ($actualUserId) {
    require_once __DIR__ . '/../../server/EditorJsRenderer.php';

    // Get nest content from database
    $stmt = $db->prepare('SELECT content FROM nest_content WHERE user_id = :user_id');
    $stmt->execute([':user_id' => $actualUserId]);
    $nestRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($nestRow && $nestRow['content']) {
        $nestContentHtml = EditorJsRenderer::render($nestRow['content']);
        $nestContentText = EditorJsRenderer::extractText($nestRow['content'], 200);
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

    // Special case: listeomin can edit developer nest
    if ($telegramUsername == 'listeomin' && $urlUsername == 'developer') {
        $isOwnNest = true;
    }
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
<?php if ($urlUsername): ?>
<!-- Open Graph meta tags for social sharing and Instant View -->
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Мурмурация" />
<meta property="og:title" content="<?php
  if ($urlUsername === 'developer') {
    echo '🍃 Гнездо разработчика';
  } elseif ($profileOwnerFirstName) {
    echo $profileOwnerEmoji ? htmlspecialchars($profileOwnerEmoji) . ' ' . htmlspecialchars($profileOwnerFirstName) : htmlspecialchars($profileOwnerFirstName);
  } else {
    echo 'Гнездо';
  }
?>" />
<?php if ($nestContentText): ?>
<meta property="og:description" content="<?php echo htmlspecialchars($nestContentText); ?>" />
<?php endif; ?>
<meta property="og:url" content="https://murmuration.monster/nest/<?php echo htmlspecialchars($urlUsername); ?>" />
<link rel="canonical" href="https://murmuration.monster/nest/<?php echo htmlspecialchars($urlUsername); ?>" />
<!-- Instant View hint -->
<meta property="al:web:url" content="https://murmuration.monster/nest/<?php echo htmlspecialchars($urlUsername); ?>" />
<?php endif; ?>
<script>
  // Pass PHP variables to JavaScript
  window.NEST_CONFIG = {
    urlUsername: <?php echo $urlUsername ? json_encode($urlUsername) : 'null'; ?>,
    profileOwnerName: <?php echo $profileOwnerName ? json_encode($profileOwnerName) : 'null'; ?>,
    telegramUserId: <?php echo $telegramUserId ? json_encode($telegramUserId) : 'null'; ?>,
    telegramUsername: <?php echo $telegramUsername ? json_encode($telegramUsername) : 'null'; ?>,
    isOwnNest: <?php echo $isOwnNest ? 'true' : 'false'; ?>,
    postSlug: <?php echo $postSlug ? json_encode($postSlug) : 'null'; ?>
  };
</script>
<link rel="icon" href="assets/favicon.png" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&family=Ubuntu+Sans:wght@400;500;600&family=Noto+Serif:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/base.css?v=6">
<link rel="stylesheet" href="css/chat.css?v=5">
<link rel="stylesheet" href="css/input.css?v=7">
<link rel="stylesheet" href="css/format-menu.css?v=4">
<link rel="stylesheet" href="css/colors.css?v=1">
<link rel="stylesheet" href="css/inline-input.css?v=3">
<link rel="stylesheet" href="css/music.css?v=1">
<link rel="stylesheet" href="css/track-preview.css?v=1">
<link rel="stylesheet" href="css/audio-player.css?v=9">
<link rel="stylesheet" href="css/nightshift.css?v=4">
<link rel="stylesheet" href="css/animalProfile.css?v=20">
<link rel="stylesheet" href="css/contextMenu.css?v=1">
<link rel="stylesheet" href="css/telegramAuth.css?v=1">
<link rel="stylesheet" href="css/navigation.css?v=7">
<link rel="stylesheet" href="css/jp-window.css?v=1">
<link rel="stylesheet" href="css/nest.css?v=27">
<link rel="stylesheet" href="css/nest-layout.css?v=39">
<link rel="stylesheet" href="css/nest-posts.css?v=23">
<link rel="stylesheet" href="css/image-zoom.css?v=3">
<!-- Tiptap Editor -->
<link rel="stylesheet" href="css/tiptap.css?v=15">
<link rel="stylesheet" href="<?php echo htmlspecialchars($basePath); ?>/css/dev-nest.css?v=6">
<!-- HeroUI Components (DatePicker) -->
<link rel="stylesheet" href="js/lib/hero-ui-components.css?v=1">
</head>
<body<?php
  $classes = ['no-js']; // Remove via JavaScript when loaded
  if ($urlUsername === 'developer') $classes[] = 'developer-page';
  echo ' class="' . implode(' ', $classes) . '"';
?>>
<?php if ($urlUsername): ?>
<div class="page-layout">
  <div class="main-column">
<?php endif; ?>

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
      if ($urlUsername === 'developer') {
        echo '🍃 Гнездо разработчика';
      } elseif ($profileOwnerFirstName) {
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

  <?php
  // Check if user has any posts
  $hasAnyPosts = false;
  if ($actualUserId) {
    $stmt = $db->prepare('SELECT COUNT(*) as count FROM nest_posts WHERE user_id = :user_id');
    $stmt->execute([':user_id' => $actualUserId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $hasAnyPosts = $result && $result['count'] > 0;
  }
  ?>
  <?php if ($urlUsername && !$isOwnNest && !$postSlug && !$hasAnyPosts): ?>
  <div class="nest-description">
    <?php if ($urlUsername === 'developer'): ?>
      <div id="github-preview-container" data-url="https://github.com/listeomin/pavilion"></div>
    <?php else: ?>
      <p style="font-style: italic; color: var(--color-nimbus-dark);">Рад встрече!</p>
      <p style="font-style: italic; color: var(--color-nimbus-dark);">Что ты думаешь обо мне?</p>
    <?php endif; ?>
  </div>
  <?php endif; ?>
  <?php if (!$isOwnNest): ?>
  <div id="telegram-auth-container"></div>
  <?php endif; ?>
  <?php if ($urlUsername): ?>
  <!-- Static HTML content for SEO and Instant View (hidden by JavaScript) -->
  <?php if ($nestContentHtml): ?>
  <article id="nest-static-content" class="nest-static-content">
    <?php
    // Add loading="lazy" to all images for performance
    $contentWithLazy = preg_replace('/<img\s/', '<img loading="lazy" decoding="async" ', $nestContentHtml);
    echo $contentWithLazy;
    ?>
  </article>
  <?php endif; ?>
  <!-- Content editor (only on personal pages) -->
  <div id="nest-editor-container">
    <?php if (!$isOwnNest): ?>
    <!-- Simple loading indicator for viewing mode -->
    <div id="initial-loader" style="display: flex; justify-content: center; align-items: center; padding: 60px 20px; opacity: 0.7;">
      <div style="width: 40px; height: 40px; border: 3px solid #E0E0E0; border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <?php endif; ?>
    <div id="nest-editor"></div>
  </div>
  <?php endif; ?>
</div><!-- .wrap -->

<?php if ($urlUsername): ?>
  </div><!-- .main-column -->
  <aside class="nest-sidebar">
    <nav class="nest-nav">
      <a href="#navigation" class="nest-nav-item active">Рубрики</a>
      <span class="nest-nav-separator">|</span>
      <a href="#meta" class="nest-nav-item">Мета</a>
      <span class="nest-nav-separator">|</span>
      <a href="#discussions" class="nest-nav-item">Обсуждения</a>
    </nav>
    <div id="discussion-whale" class="discussion-whale" style="display: none;">
      <img src="assets/motivation.png" alt="Кит приглашает написать">
    </div>
  </aside>
</div><!-- .page-layout -->
<?php endif; ?>
<?php if ($urlUsername !== 'developer'): ?>
<?php endif; ?>

<?php if (!$urlUsername): ?>
<img src="assets/owl.png" id="jp-window" alt="Owl">
<?php endif; ?>

<!-- Sort Context Menu -->
<div id="nest-sort-menu" class="context-menu">
  <div class="context-menu-item" data-sort="author">Как задумал автор</div>
  <div class="context-menu-item" data-sort="created">По дате создания</div>
  <div class="context-menu-item" data-sort="published">По дате публикации</div>
  <div class="context-menu-item" data-sort="modified">По дате изменения</div>
</div>

<!-- Date/time libraries - defer to not block initial render -->
<script defer src="libs/dayjs.min.js"></script>
<script defer src="libs/dayjs-relativeTime.min.js"></script>
<script defer src="libs/dayjs-ru.js"></script>
<!-- HeroUI Components -->
<script defer src="js/lib/hero-ui-components.iife.js?v=1"></script>

<!-- Preload all JS modules to enable parallel loading -->
<link rel="modulepreload" href="js/config.js?v=7">
<link rel="modulepreload" href="js/api.js?v=7">
<link rel="modulepreload" href="js/nightshift.js?v=1">
<link rel="modulepreload" href="js/animalProfile.js?v=18">
<link rel="modulepreload" href="js/telegramAuth.js?v=2">
<link rel="modulepreload" href="js/github.js?v=5">
<link rel="modulepreload" href="js/youtube.js?v=2">
<link rel="modulepreload" href="js/music.js?v=9">
<link rel="modulepreload" href="js/image-zoom.js?v=12">
<link rel="modulepreload" href="js/nest-posts-manager.js?v=26">
<link rel="modulepreload" href="js/discussions.js?v=2">
<link rel="modulepreload" href="js/nest-utils.js?v=1">
<link rel="modulepreload" href="js/nest-sections.js?v=1">

<script type="module" src="js/nest.js?v=154"></script>
</body>
</html>