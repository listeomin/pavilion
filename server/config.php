<?php
// server/config.php

/**
 * Detect BASE_PATH from request URI
 * Returns '' for root or '/pavilion' for subdirectory deployment
 */
function get_base_path(): string {
    static $basePath = null;
    
    if ($basePath !== null) {
        return $basePath;
    }
    
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    
    // If URI starts with /pavilion/, use it as base
    if (strpos($uri, '/pavilion/') === 0) {
        $basePath = '/pavilion';
    } else {
        $basePath = '';
    }
    
    return $basePath;
}
