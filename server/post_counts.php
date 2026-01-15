<?php
// Helper functions for managing post counts per tag/category

/**
 * Increment post count for a tag
 */
function increment_post_count($db, $user_id, $tag) {
    if (!$tag || trim($tag) === '') {
        return;
    }

    $tag = strtolower(trim($tag));
    $now = date('Y-m-d H:i:s');

    // Insert or increment
    $stmt = $db->prepare('
        INSERT INTO nest_post_counts (user_id, tag, count, updated_at)
        VALUES (:user_id, :tag, 1, :updated_at)
        ON CONFLICT(user_id, tag) DO UPDATE SET
            count = count + 1,
            updated_at = :updated_at
    ');

    $stmt->execute([
        ':user_id' => $user_id,
        ':tag' => $tag,
        ':updated_at' => $now
    ]);
}

/**
 * Decrement post count for a tag
 */
function decrement_post_count($db, $user_id, $tag) {
    if (!$tag || trim($tag) === '') {
        return;
    }

    $tag = strtolower(trim($tag));
    $now = date('Y-m-d H:i:s');

    // Decrement count, but don't go below 0
    $stmt = $db->prepare('
        UPDATE nest_post_counts
        SET count = MAX(0, count - 1),
            updated_at = :updated_at
        WHERE user_id = :user_id AND tag = :tag
    ');

    $stmt->execute([
        ':user_id' => $user_id,
        ':tag' => $tag,
        ':updated_at' => $now
    ]);

    // Delete if count reached 0
    $stmt = $db->prepare('DELETE FROM nest_post_counts WHERE user_id = :user_id AND tag = :tag AND count = 0');
    $stmt->execute([':user_id' => $user_id, ':tag' => $tag]);
}

/**
 * Update counts when tag changes (decrement old, increment new)
 */
function update_post_count_for_tag_change($db, $user_id, $old_tag, $new_tag) {
    // Normalize tags
    $old_tag = $old_tag ? strtolower(trim($old_tag)) : null;
    $new_tag = $new_tag ? strtolower(trim($new_tag)) : null;

    // If tags are the same, no change needed
    if ($old_tag === $new_tag) {
        return;
    }

    // Decrement old tag
    if ($old_tag) {
        decrement_post_count($db, $user_id, $old_tag);
    }

    // Increment new tag
    if ($new_tag) {
        increment_post_count($db, $user_id, $new_tag);
    }
}

/**
 * Get post counts for a user
 */
function get_post_counts($db, $user_id) {
    $stmt = $db->prepare('SELECT tag, count FROM nest_post_counts WHERE user_id = :user_id ORDER BY tag');
    $stmt->execute([':user_id' => $user_id]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
