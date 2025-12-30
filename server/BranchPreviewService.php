<?php
// server/BranchPreviewService.php

class BranchPreviewService {
    private PDO $db;

    public function __construct(?PDO $db = null) {
        $this->db = $db ?? get_db();
    }

    public function parseBranchUrl(string $text): ?array {
        // Match URLs like:
        // https://hhrrr.ru/pavilion/branches/1
        // https://murmuration.monster/branches/1
        if (preg_match('~https?://(?:hhrrr\.ru/pavilion|murmuration\.monster)/branches/(\d+)~i', $text, $matches)) {
            return [
                'branch_id' => $matches[1],
                'url' => $matches[0]
            ];
        }
        return null;
    }

    public function fetchBranchMetadata(int $branchId, string $url): ?array {
        // Get branch info
        $stmt = $this->db->prepare('SELECT id, title FROM branches WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $branchId]);
        $branch = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$branch) {
            return null;
        }

        return [
            'type' => 'branch',
            'title' => $branch['title'],
            'branch_id' => $branchId,
            'url' => $url
        ];
    }

    public function enrichMessage(string $text): ?array {
        $branchUrl = $this->parseBranchUrl($text);

        if (!$branchUrl) {
            return null;
        }

        return $this->fetchBranchMetadata((int)$branchUrl['branch_id'], $branchUrl['url']);
    }
}
