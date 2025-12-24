<?php
// gnezdo.php

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
<link rel="stylesheet" href="css/navigation.css?v=1">
</head>
<body>
<nav class="main-nav">
  <a href="./" class="nav-item">Беседка</a>
  <span class="nav-separator">|</span>
  <a href="gnezdo.php" class="nav-item active">Гнездо</a>
  <span class="nav-separator">|</span>
  <span class="nav-item disabled">Послания</span>
  <span class="nav-separator">|</span>
  <span class="nav-item disabled">Ветки</span>
</nav>
<div class="wrap">
  <h1>Вы в Гнезде</h1>
</div>
</body>
</html>
