<?php
/**
 * Utility buttons partial
 *
 * Usage:
 *   include_partial('utility-buttons.php');                         // default (fixed right)
 *   include_partial('utility-buttons.php', ['variant' => 'nest']);  // nest variant (inside main-column)
 *
 * Variants:
 *   - default: fixed position at right edge of screen
 *   - nest: positioned inside main-column, respects sidebar
 */

$variant = $variant ?? 'default';
$variantClass = $variant === 'nest' ? 'utility-buttons-nest' : '';
?>
<link rel="stylesheet" href="css/utility-buttons.css?v=2">
<div id="utility-buttons-group" class="<?php echo $variantClass; ?>">
  <button id="animal-profile-btn" title="Звериный профиль"></button>
  <button id="nightshift-toggle" title="Ночной режим"></button>
  <button id="dev-nest-btn" href="nest/developer" title="Гнездо разработчика"></button>
</div>
