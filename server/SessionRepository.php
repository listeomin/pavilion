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

        // load available names from JSON
        $namesFile = __DIR__ . '/user_names.json';
        $allNames = json_decode(file_get_contents($namesFile), true);

        // get already taken names
        $stmt = $this->db->query("SELECT name FROM sessions");
        $takenNames = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // find available names
        $availableNames = array_diff($allNames, $takenNames);

        // if no available names, reuse all names (shuffle and pick random)
        if (empty($availableNames)) {
            $availableNames = $allNames;
        }

        // pick random name from available
        $availableNames = array_values($availableNames); // reindex
        $name = $availableNames[array_rand($availableNames)];

        $ins = $this->db->prepare('INSERT INTO sessions (id, name, created_at) VALUES (:id, :name, :created_at)');
        $ins->execute([
            ':id' => $id,
            ':name' => $name,
            ':created_at' => $now
        ]);

        return ['id' => $id, 'name' => $name, 'created_at' => $now];
    }
}
