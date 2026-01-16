<?php
/**
 * Global configuration for the Pavilion project
 * Include this file at the top of any PHP page to get access to paths
 *
 * Usage:
 *   require_once __DIR__ . '/config.php';           // from public/index.php
 *   require_once __DIR__ . '/../config.php';        // from public/nest/index.php
 *   require_once dirname(__DIR__) . '/config.php';  // alternative
 */

// Define PUBLIC_ROOT as the directory containing this config file
if (!defined('PUBLIC_ROOT')) {
    define('PUBLIC_ROOT', __DIR__);
}

// Helper function to include partials
function include_partial($name, $options = []) {
    $path = PUBLIC_ROOT . '/partials/' . $name;

    // Make options available in the partial
    extract($options);

    include $path;
}
