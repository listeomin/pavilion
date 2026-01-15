<?php
// Run migration script
require_once __DIR__ . '/../server/db.php';

try {
    $db = get_db();

    // Read and execute migration
    $sql = file_get_contents(__DIR__ . '/create_nest_post_counts.sql');

    // Split by semicolons and execute each statement
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    foreach ($statements as $statement) {
        if (!empty($statement)) {
            echo "Executing: " . substr($statement, 0, 100) . "...\n";
            $db->exec($statement);
            echo "✓ Success\n\n";
        }
    }

    // Verify table was created
    $result = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='nest_post_counts'");
    $table = $result->fetch(PDO::FETCH_ASSOC);

    if ($table) {
        echo "✓ Table nest_post_counts created successfully\n";

        // Show initial counts
        $stmt = $db->query("SELECT user_id, tag, count FROM nest_post_counts ORDER BY user_id, tag");
        $counts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "\nInitialized counts:\n";
        foreach ($counts as $row) {
            echo "  User {$row['user_id']}, Tag '{$row['tag']}': {$row['count']} posts\n";
        }
    } else {
        echo "✗ Table creation failed\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
