<?php
// server/Logger.php

class Logger {
    private static $logFile = __DIR__ . '/../logs/debug.log';

    public static function log($message, $data = null) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[{$timestamp}] {$message}";

        if ($data !== null) {
            $logEntry .= "\n" . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        }

        $logEntry .= "\n" . str_repeat('-', 80) . "\n";

        file_put_contents(self::$logFile, $logEntry, FILE_APPEND);
    }

    public static function clear() {
        file_put_contents(self::$logFile, '');
    }
}
