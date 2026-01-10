#!/usr/bin/env php
<?php
/**
 * Database migration runner
 * Usage: php database/migrate.php
 */

require_once __DIR__ . '/../server/db.php';

function runMigration($filename) {
    echo "Running migration: $filename\n";

    $sql = file_get_contents(__DIR__ . '/' . $filename);
    if ($sql === false) {
        echo "ERROR: Could not read migration file: $filename\n";
        return false;
    }

    $db = get_db();

    try {
        $db->beginTransaction();

        // Split by semicolon and execute each statement
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function($stmt) {
                // Filter out empty statements and comments
                return !empty($stmt) && !preg_match('/^\s*--/', $stmt);
            }
        );

        foreach ($statements as $statement) {
            if (!empty($statement)) {
                $db->exec($statement);
            }
        }

        $db->commit();
        echo "✓ Migration completed successfully: $filename\n\n";
        return true;
    } catch (PDOException $e) {
        $db->rollBack();
        echo "✗ Migration failed: " . $e->getMessage() . "\n\n";
        return false;
    }
}

// Get all migration files
$migrations = glob(__DIR__ . '/*.sql');
sort($migrations);

echo "=== Database Migration Tool ===\n\n";
echo "Found " . count($migrations) . " migration(s)\n\n";

$success = 0;
$failed = 0;

foreach ($migrations as $migration) {
    $filename = basename($migration);
    if (runMigration($filename)) {
        $success++;
    } else {
        $failed++;
    }
}

echo "=== Migration Summary ===\n";
echo "Success: $success\n";
echo "Failed: $failed\n";

exit($failed > 0 ? 1 : 0);
