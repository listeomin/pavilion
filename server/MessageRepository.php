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

    public function update(int $id, string $author, string $text, ?array $metadata = null): ?array {
        // Check if message exists and belongs to this author
        $stmt = $this->db->prepare('SELECT id, author FROM messages WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing || $existing['author'] !== $author) {
            return null; // Not found or unauthorized
        }
        
        $metadataJson = $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null;
        
        $stmt = $this->db->prepare('UPDATE messages SET text = :text, metadata = :metadata WHERE id = :id');
        $stmt->execute([
            ':id' => $id,
            ':text' => $text,
            ':metadata' => $metadataJson
        ]);
        
        // Fetch and return updated message
        $stmt = $this->db->prepare('SELECT id, session_id, author, text, metadata, created_at FROM messages WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row && !empty($row['metadata'])) {
            $row['metadata'] = json_decode($row['metadata'], true);
        } elseif ($row) {
            unset($row['metadata']);
        }
        
        return $row ?: null;
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
