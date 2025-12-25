<?php
// server/UserRepository.php - Репозиторий для работы с пользователями

class UserRepository {
    private PDO $db;

    public function __construct(?PDO $db = null) {
        $this->db = $db ?? get_db();
    }

    /**
     * Создать или получить пользователя по Telegram ID
     */
    public function findOrCreateByTelegramId(int $telegram_id, string $telegram_username = '', string $telegram_first_name = ''): array {
        // Проверяем существует ли пользователь
        $user = $this->findByTelegramId($telegram_id);

        if ($user) {
            // Обновляем username если изменился
            if ($telegram_username && $user['telegram_username'] !== $telegram_username) {
                $this->updateTelegramUsername($user['id'], $telegram_username);
                $user['telegram_username'] = $telegram_username;
            }
            return $user;
        }

        // Создаем нового пользователя
        return $this->create($telegram_id, $telegram_username, $telegram_first_name);
    }

    /**
     * Найти пользователя по Telegram ID
     */
    public function findByTelegramId(int $telegram_id): ?array {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE telegram_id = :telegram_id');
        $stmt->execute([':telegram_id' => $telegram_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Найти пользователя по ID
     */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Создать нового пользователя
     */
    private function create(int $telegram_id, string $telegram_username, string $telegram_first_name): array {
        $now = (new DateTime())->format(DateTime::ATOM);

        $stmt = $this->db->prepare('
            INSERT INTO users (telegram_id, telegram_username, telegram_first_name, created_at, updated_at)
            VALUES (:telegram_id, :telegram_username, :telegram_first_name, :created_at, :updated_at)
        ');

        $stmt->execute([
            ':telegram_id' => $telegram_id,
            ':telegram_username' => $telegram_username,
            ':telegram_first_name' => $telegram_first_name,
            ':created_at' => $now,
            ':updated_at' => $now
        ]);

        $userId = (int)$this->db->lastInsertId();

        // ВАЖНО: Создаем бэкап после регистрации нового пользователя
        $this->createBackup("new_user_{$telegram_id}");

        return [
            'id' => $userId,
            'telegram_id' => $telegram_id,
            'telegram_username' => $telegram_username,
            'telegram_first_name' => $telegram_first_name,
            'created_at' => $now,
            'updated_at' => $now
        ];
    }

    /**
     * Обновить Telegram username
     */
    private function updateTelegramUsername(int $userId, string $telegram_username): void {
        $stmt = $this->db->prepare('
            UPDATE users
            SET telegram_username = :telegram_username, updated_at = :updated_at
            WHERE id = :id
        ');

        $stmt->execute([
            ':telegram_username' => $telegram_username,
            ':updated_at' => (new DateTime())->format(DateTime::ATOM),
            ':id' => $userId
        ]);
    }

    /**
     * Создать бэкап базы данных
     */
    private function createBackup(string $reason = 'manual'): bool {
        try {
            $backupDir = __DIR__ . '/../backups';

            // Создаем папку для бэкапов если её нет
            if (!file_exists($backupDir)) {
                mkdir($backupDir, 0755, true);
            }

            $dbPath = __DIR__ . '/../chat.sqlite';
            $timestamp = date('Y-m-d_H-i-s');
            $backupPath = "{$backupDir}/chat_backup_{$timestamp}_{$reason}.sqlite";

            // Копируем базу данных
            if (copy($dbPath, $backupPath)) {
                error_log("[UserRepository] Backup created: {$backupPath}");

                // Удаляем старые бэкапы (оставляем последние 50)
                $this->cleanOldBackups($backupDir, 50);

                return true;
            }

            return false;
        } catch (Exception $e) {
            error_log("[UserRepository] Backup failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Очистить старые бэкапы
     */
    private function cleanOldBackups(string $backupDir, int $keepCount): void {
        $files = glob($backupDir . '/chat_backup_*.sqlite');

        if (count($files) > $keepCount) {
            // Сортируем по времени модификации (старые первыми)
            usort($files, function($a, $b) {
                return filemtime($a) - filemtime($b);
            });

            // Удаляем старые
            $toDelete = array_slice($files, 0, count($files) - $keepCount);
            foreach ($toDelete as $file) {
                unlink($file);
                error_log("[UserRepository] Deleted old backup: {$file}");
            }
        }
    }

    /**
     * Получить общее количество пользователей
     */
    public function count(): int {
        $stmt = $this->db->query('SELECT COUNT(*) FROM users');
        return (int)$stmt->fetchColumn();
    }
}
