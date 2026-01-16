<?php
/**
 * Main navigation partial
 *
 * Usage:
 *   include_partial('main-nav.php', ['active' => 'home']);      // Мурмурация
 *   include_partial('main-nav.php', ['active' => 'branches']);  // Ветки
 *   include_partial('main-nav.php', ['active' => 'messages']);  // Послания
 *   include_partial('main-nav.php', ['active' => 'nest']);      // Гнездо
 */

$active = $active ?? '';
?>
<nav class="main-nav">
  <a href="./" class="nav-item<?php if ($active === 'home') echo ' active'; ?>">Мурмурация</a>
  <span class="nav-separator">|</span>
  <a href="branches" class="nav-item<?php if ($active === 'branches') echo ' active'; ?>">Ветки</a>
  <span class="nav-separator">|</span>
  <a href="messages" class="nav-item<?php if ($active === 'messages') echo ' active'; ?>">Послания</a>
  <span class="nav-separator">|</span>
  <a href="nest" class="nav-item<?php if ($active === 'nest') echo ' active'; ?>">Гнездо</a>
</nav>
