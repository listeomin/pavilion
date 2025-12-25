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

    public function getByUserId(int $userId): ?array {
        $stmt = $this->db->prepare('SELECT id, name, created_at FROM sessions WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([':user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function create(?int $userId = null): array {
        // generate hex id
        $id = bin2hex(random_bytes(16));
        $now = (new DateTime())->format(DateTime::ATOM);

        // Если есть user_id, пробуем загрузить имя из animal_profile
        $newName = null;
        if ($userId) {
            $animal_db_path = __DIR__ . '/../public/data/animal.sqlite';
            if (file_exists($animal_db_path)) {
                $animal_db = new SQLite3($animal_db_path);
                $profileStmt = $animal_db->prepare('SELECT emoji, kind FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
                $profileStmt->bindValue(':user_id', $userId, SQLITE3_INTEGER);
                $profileResult = $profileStmt->execute();
                $profile = $profileResult->fetchArray(SQLITE3_ASSOC);

                if ($profile && $profile['emoji']) {
                    $emoji = $profile['emoji'];
                    $kind = $profile['kind'] ?: 'существо';
                    $candidateName = $emoji . ' ' . $kind;

                    // Проверяем не занято ли это имя
                    $checkStmt = $this->db->prepare('SELECT id, user_id FROM sessions WHERE name = :name');
                    $checkStmt->execute([':name' => $candidateName]);
                    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

                    if (!$existing) {
                        // Имя свободно
                        $newName = $candidateName;
                    } else if ($existing['user_id'] == $userId) {
                        // Это наша старая сессия - вернём её вместо создания новой!
                        return $this->get($existing['id']);
                    }
                    // Если имя занято другим пользователем - fallback к JSON генерации
                }
                $animal_db->close();
            }
        }

        // Если не нашли имя в профиле, генерируем из JSON
        if (!$newName) {
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
        }

        if ($userId) {
            $ins = $this->db->prepare('INSERT INTO sessions (id, name, created_at, user_id) VALUES (:id, :name, :created_at, :user_id)');
            $ins->execute([
                ':id' => $id,
                ':name' => $newName,
                ':created_at' => $now,
                ':user_id' => $userId
            ]);
        } else {
            $ins = $this->db->prepare('INSERT INTO sessions (id, name, created_at) VALUES (:id, :name, :created_at)');
            $ins->execute([
                ':id' => $id,
                ':name' => $newName,
                ':created_at' => $now
            ]);
        }

        return ['id' => $id, 'name' => $newName, 'created_at' => $now];
    }
}
