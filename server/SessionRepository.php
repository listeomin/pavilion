<?php
// server/SessionRepository.php
require_once __DIR__ . '/db.php';

class SessionRepository {
    private PDO $db;
    private string $namesFile;

    public function __construct(?PDO $db = null, ?string $namesFile = null) {
        $this->db = $db ?? get_db();
        $this->namesFile = $namesFile ?? __DIR__ . '/user_names.json';
    }

    public function get(string $id): ?array {
        $stmt = $this->db->prepare('SELECT id, name, created_at FROM sessions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function changeName(string $id): ?array {
        $session = $this->get($id);
        if (!$session) return null;

        // load available names from JSON
        $allNames = json_decode(file_get_contents($this->namesFile), true);

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
        $newName = $availableNames[array_rand($availableNames)];

        $upd = $this->db->prepare('UPDATE sessions SET name = :name WHERE id = :id');
        $upd->execute([':name' => $newName, ':id' => $id]);

        return ['id' => $id, 'name' => $newName, 'created_at' => $session['created_at']];
    }

    public function create(): array {
        // generate hex id
        $id = bin2hex(random_bytes(16));
        $now = (new DateTime())->format(DateTime::ATOM);

        // load available names from JSON
        $allNames = json_decode(file_get_contents($this->namesFile), true);

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
        $newName = $availableNames[array_rand($availableNames)];

        $ins = $this->db->prepare('INSERT INTO sessions (id, name, created_at) VALUES (:id, :name, :created_at)');
        $ins->execute([
            ':id' => $id,
            ':name' => $newName,
            ':created_at' => $now
        ]);

        return ['id' => $id, 'name' => $newName, 'created_at' => $now];
    }
}
