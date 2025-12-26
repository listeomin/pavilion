<?php
// gnezdo/index.php

// Auto-detect BASE_PATH from request URI
function get_base_path() {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, '/pavilion/') === 0) {
        return '/pavilion';
    }
    return '';
}

$basePath = get_base_path();
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<base href="<?php echo htmlspecialchars($basePath); ?>/">
<title>Гнездо</title>
<link rel="icon" href="assets/favicon.png" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&family=Ubuntu+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/base.css?v=4">
<link rel="stylesheet" href="css/colors.css?v=1">
<link rel="stylesheet" href="css/nightshift.css?v=1">
<link rel="stylesheet" href="css/animalProfile.css?v=17">
<link rel="stylesheet" href="css/navigation.css?v=2">
</head>
<body>
<nav class="main-nav">
  <a href="../" class="nav-item">Мурмурация</a>
  <span class="nav-separator">|</span>
  <span class="nav-item disabled">Ветки</span>
  <span class="nav-separator">|</span>
  <span class="nav-item disabled">Послания</span>
  <span class="nav-separator">|</span>
  <a href="./" class="nav-item active">Гнездо</a>
</nav>
<div class="wrap">
  <div id="header-container">
    <div id="user-header">
      <span id="user-emoji" class="user-emoji-clickable"></span>
      <span id="user-label-header">– это вы!</span>
    </div>
    <h1>Гнездо</h1>
  </div>
</div>
<button id="animal-profile-btn" class="animal-profile-trigger" title="Звериный профиль">
  <img src="assets/paw.svg" alt="Animal Profile">
</button>
<button id="nightshift-toggle">
  <img src="assets/moon.svg" alt="Night Shift">
</button>
<script type="module" src="js/gnezdo.js"></script>
</body>
</html>
