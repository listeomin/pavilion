<?php
// server/SessionRepository.php
require_once __DIR__ . '/db.php';

class SessionRepository {
    private PDO $db;

    public function __construct() {
        $this->db = get_db();
    }

    public function get(string $id): ?array {
        $stmt = $this->db->prepare('SELECT id, name, created_at FROM sessions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function create(): array {
        // generate hex id
        $id = bin2hex(random_bytes(16));
        $now = (new DateTime())->format(DateTime::ATOM);

        // find last user_NNN
        $stmt = $this->db->query("SELECT name FROM sessions WHERE name LIKE 'user_%' ORDER BY name DESC LIMIT 1");
        $last = $stmt->fetchColumn();

        if ($last) {
            // extract number
            if (preg_match('/user_(\d+)/', $last, $m)) {
                $num = intval($m[1]) + 1;
            } else {
                $num = 1;
            }
        } else {
            $num = 1;
        }

        $name = 'user_' . str_pad((string)$num, 3, '0', STR_PAD_LEFT);

        $ins = $this->db->prepare('INSERT INTO sessions (id, name, created_at) VALUES (:id, :name, :created_at)');
        $ins->execute([
            ':id' => $id,
            ':name' => $name,
            ':created_at' => $now
        ]);

        return ['id' => $id, 'name' => $name, 'created_at' => $now];
    }
}
