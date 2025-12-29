<?php
// server/NestPreviewService.php

class NestPreviewService {
    private PDO $db;
    private string $animalDbPath;

    public function __construct(?PDO $db = null, ?string $animalDbPath = null) {
        $this->db = $db ?? get_db();
        $this->animalDbPath = $animalDbPath ?? __DIR__ . '/../public/data/animal.sqlite';
    }

    public function parseNestUrl(string $text): ?array {
        // Match URLs like: https://hhrrr.ru/pavilion/nest/username or http://hhrrr.ru/pavilion/nest/5740117539
        if (preg_match('~https?://hhrrr\.ru/pavilion/nest/([^/\s?#]+)~i', $text, $matches)) {
            return [
                'identifier' => $matches[1],
                'url' => $matches[0]
            ];
        }
        return null;
    }

    public function fetchNestMetadata(string $identifier, string $url): ?array {
        // Try to find user by telegram_username first
        $stmt = $this->db->prepare('SELECT id FROM users WHERE telegram_username = :username');
        $stmt->execute([':username' => $identifier]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // If not found and identifier is numeric, try to find by telegram_id
        if (!$user && is_numeric($identifier)) {
            $stmt = $this->db->prepare('SELECT id FROM users WHERE telegram_id = :telegram_id');
            $stmt->execute([':telegram_id' => (int)$identifier]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$user) {
            return null;
        }

        $userId = (int)$user['id'];

        // Load animal profile
        if (!file_exists($this->animalDbPath)) {
            return null;
        }

        $animalDb = new SQLite3($this->animalDbPath);
        $profileStmt = $animalDb->prepare('SELECT emoji, kind FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
        $profileStmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
        $profileResult = $profileStmt->execute();
        $profile = $profileResult->fetchArray(SQLITE3_ASSOC);
        $animalDb->close();

        if (!$profile || !$profile['emoji']) {
            return null;
        }

        return [
            'type' => 'nest',
            'emoji' => $profile['emoji'],
            'title' => $profile['kind'] ?: 'существо',
            'identifier' => $identifier,
            'url' => $url
        ];
    }

    public function enrichMessage(string $text): ?array {
        $nestUrl = $this->parseNestUrl($text);

        if (!$nestUrl) {
            return null;
        }

        return $this->fetchNestMetadata($nestUrl['identifier'], $nestUrl['url']);
    }
}
