<?php
// server/MessageRepository.php
require_once __DIR__ . '/db.php';

class MessageRepository {
    private PDO $db;

    public function __construct() {
        $this->db = get_db();
    }

    public function add(string $session_id, string $author, string $text, ?array $metadata = null): array {
        $now = (new DateTime())->format(DateTime::ATOM);
        $metadataJson = $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null;
        
        $stmt = $this->db->prepare('INSERT INTO messages (session_id, author, text, metadata, created_at) VALUES (:session_id, :author, :text, :metadata, :created_at)');
        $stmt->execute([
            ':session_id' => $session_id,
            ':author' => $author,
            ':text' => $text,
            ':metadata' => $metadataJson,
            ':created_at' => $now
        ]);
        $id = (int)$this->db->lastInsertId();
        
        $result = [
            'id' => $id,
            'session_id' => $session_id,
            'author' => $author,
            'text' => $text,
            'created_at' => $now
        ];
        
        if ($metadata) {
            $result['metadata'] = $metadata;
        }
        
        return $result;
    }

    public function getAll(): array {
        $stmt = $this->db->query('SELECT id, session_id, author, text, metadata, created_at FROM messages ORDER BY id ASC');
        return $this->decodeMetadata($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function getLastPage(int $limit = 50): array {
        $stmt = $this->db->prepare('SELECT id, session_id, author, text, metadata, created_at FROM messages ORDER BY id DESC LIMIT :limit');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_reverse($this->decodeMetadata($rows));
    }

    public function getSinceId(?int $afterId): array {
        if ($afterId === null) {
            return $this->getAll();
        }
        $stmt = $this->db->prepare('SELECT id, session_id, author, text, metadata, created_at FROM messages WHERE id > :after ORDER BY id ASC');
        $stmt->execute([':after' => $afterId]);
        return $this->decodeMetadata($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function decodeMetadata(array $rows): array {
        foreach ($rows as &$row) {
            if (!empty($row['metadata'])) {
                $row['metadata'] = json_decode($row['metadata'], true);
            } else {
                unset($row['metadata']);
            }
        }
        return $rows;
    }
}
