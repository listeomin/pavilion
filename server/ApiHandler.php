<?php
// server/ApiHandler.php

class ApiHandler {
    private SessionRepository $sessionRepo;
    private MessageRepository $msgRepo;
    private GitHubService $githubService;
    private PinterestService $pinterestService;
    private LinkPreviewService $linkPreviewService;
    private ImageUploadService $imageService;
    private BroadcastService $broadcastService;

    public function __construct(
        ?SessionRepository $sessionRepo = null,
        ?MessageRepository $msgRepo = null,
        ?GitHubService $githubService = null,
        ?PinterestService $pinterestService = null,
        ?LinkPreviewService $linkPreviewService = null,
        ?ImageUploadService $imageService = null,
        ?BroadcastService $broadcastService = null
    ) {
        $this->sessionRepo = $sessionRepo ?? new SessionRepository();
        $this->msgRepo = $msgRepo ?? new MessageRepository();
        $this->githubService = $githubService ?? new GitHubService();
        $this->pinterestService = $pinterestService ?? new PinterestService();
        $this->linkPreviewService = $linkPreviewService ?? new LinkPreviewService();
        $this->imageService = $imageService ?? new ImageUploadService();
        $this->broadcastService = $broadcastService ?? new BroadcastService();
    }

    public function init(array $input, array $cookies = []): array {
        $cookieId = $input['session_id'] ?? $cookies['chat_session_id'] ?? null;

        // Проверяем авторизацию через Telegram
        session_start();
        $telegram_user_id = $_SESSION['telegram_user']['user_id'] ?? null;

        Logger::log('API init() called', [
            'cookieId' => $cookieId,
            'input_session_id' => $input['session_id'] ?? null,
            'cookie_session_id' => $cookies['chat_session_id'] ?? null,
            'telegram_user_id' => $telegram_user_id
        ]);

        $session = null;
        $isNew = false;

        // ПРИОРИТЕТ: Telegram сессия важнее cookie!
        if ($telegram_user_id) {
            // Ищем сессию по Telegram user_id
            $session = $this->sessionRepo->getByUserId($telegram_user_id);
            Logger::log('Session lookup by Telegram user_id', [
                'user_id' => $telegram_user_id,
                'session_found' => $session !== null,
                'session' => $session
            ]);

            if ($session) {
                // Нашли Telegram сессию - обновим cookie если нужно
                if ($cookieId !== $session['id']) {
                    $isNew = true; // Обновим cookie на правильный
                    Logger::log('Updating cookie to Telegram session', [
                        'old_cookie' => $cookieId,
                        'new_session_id' => $session['id']
                    ]);
                }
            }
        }

        // Если нет Telegram сессии, проверяем cookie
        if (!$session && $cookieId) {
            $session = $this->sessionRepo->get($cookieId);
            Logger::log('Session lookup by cookie (no Telegram auth)', [
                'cookieId' => $cookieId,
                'session_found' => $session !== null,
                'session' => $session
            ]);
        }

        if ($session) {
            $messages = $this->msgRepo->getAll();
            $isNew = $isNew; // Preserve the value set above
        } else {
            // Создаём новую сессию
            $session = $this->sessionRepo->create($telegram_user_id);
            $messages = $this->msgRepo->getLastPage(50);
            $isNew = true;
        }

        Logger::log('API init() returning data', [
            'session_id' => $session['id'],
            'session_id_type' => gettype($session['id']),
            'is_new' => $isNew,
            'messages_count' => count($messages),
            'first_3_messages' => array_slice($messages, 0, 3)
        ]);

        return [
            'session_id' => $session['id'],
            'name' => $session['name'],
            'is_new' => $isNew,
            'messages' => $messages,
            'set_cookie' => $isNew ? [
                'name' => 'chat_session_id',
                'value' => $session['id'],
                'expires' => time() + 60*60*24*30,
                'path' => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ] : null
        ];
    }

    public function send(array $input): array {
        $session_id = $input['session_id'] ?? null;
        $text = trim($input['text'] ?? '');
        $clientMetadata = $input['metadata'] ?? null;

        if (!$session_id) {
            throw new InvalidArgumentException('session_id required');
        }
        
        if ($text === '' && !$clientMetadata) {
            throw new InvalidArgumentException('text or metadata required');
        }

        $session = $this->sessionRepo->get($session_id);
        if (!$session) {
            throw new RuntimeException('invalid session');
        }

        // Priority: client metadata > Pinterest > GitHub > generic link preview
        $metadata = $clientMetadata;
        if (!$metadata) {
            $metadata = $this->pinterestService->enrichMessage($text);
        }
        if (!$metadata) {
            $metadata = $this->githubService->enrichMessage($text);
        }
        if (!$metadata) {
            $metadata = $this->linkPreviewService->enrichMessage($text);
        }

        $message = $this->msgRepo->add($session_id, $session['name'], $text, $metadata);
        $this->broadcastService->messageNew($message);
        return $message;
    }

    public function changeName(array $input): array {
        $session_id = $input['session_id'] ?? null;

        if (!$session_id) {
            throw new InvalidArgumentException('session_id required');
        }

        $session = $this->sessionRepo->changeName($session_id);
        if (!$session) {
            throw new RuntimeException('invalid session');
        }

        return $session;
    }

    public function uploadImage(array $files): array {
        if (!isset($files['image'])) {
            throw new InvalidArgumentException('No image provided');
        }

        $result = $this->imageService->upload($files['image']);
        
        if (!$result['success']) {
            throw new RuntimeException($result['error'] ?? 'Upload failed');
        }
        
        return $result;
    }

    public function deleteImage(array $input): array {
        $id = $input['id'] ?? null;

        if (!$id) {
            throw new InvalidArgumentException('ID required');
        }

        $result = $this->imageService->delete($id);
        
        if (!$result['success']) {
            throw new RuntimeException($result['error'] ?? 'Delete failed');
        }
        
        return $result;
    }

    public function updateMessage(array $input): array {
        $session_id = $input['session_id'] ?? null;
        $message_id = $input['message_id'] ?? null;
        $text = trim($input['text'] ?? '');
        $clientMetadata = $input['metadata'] ?? null;

        if (!$session_id || !$message_id) {
            throw new InvalidArgumentException('session_id and message_id required');
        }

        if ($text === '' && !$clientMetadata) {
            throw new InvalidArgumentException('text or metadata required');
        }

        $session = $this->sessionRepo->get($session_id);
        if (!$session) {
            throw new RuntimeException('invalid session');
        }

        // Priority: client metadata > Pinterest > GitHub > generic link preview
        $metadata = $clientMetadata;
        if (!$metadata) {
            $metadata = $this->pinterestService->enrichMessage($text);
        }
        if (!$metadata) {
            $metadata = $this->githubService->enrichMessage($text);
        }
        if (!$metadata) {
            $metadata = $this->linkPreviewService->enrichMessage($text);
        }

        $message = $this->msgRepo->update($message_id, $session['name'], $text, $metadata);
        
        if (!$message) {
            throw new RuntimeException('message not found or unauthorized');
        }
        
        $this->broadcastService->messageUpdated($message);
        return $message;
    }

    public function rebase(): array {
        $scriptPath = __DIR__ . '/../db-reset.sh';

        if (!file_exists($scriptPath)) {
            throw new RuntimeException('rebase script not found');
        }

        // Execute script
        $output = [];
        $returnCode = 0;
        exec("bash {$scriptPath} 2>&1", $output, $returnCode);

        if ($returnCode !== 0) {
            throw new RuntimeException('rebase failed: ' . implode("\n", $output));
        }

        // Get fresh messages
        $messages = $this->msgRepo->getAll();

        // Broadcast to all clients
        $this->broadcastService->rebase($messages);

        return ['success' => true, 'messages' => $messages];
    }

    public function version(): array {
        // Read version from version.json
        $projectRoot = dirname(__DIR__);
        $versionFile = $projectRoot . '/public/js/version.json';
        $version = '0.0.0'; // fallback

        if (file_exists($versionFile)) {
            $content = file_get_contents($versionFile);
            if ($content !== false) {
                $versionData = json_decode($content, true);
                if ($versionData && isset($versionData['version'])) {
                    $version = $versionData['version'];
                }
            }
        }

        // Create system session (captain's bridge)
        $systemId = 'system_captain';
        $systemName = '🛳️ капитанская рубка';

        // Check if system session exists, create if not
        $systemSession = $this->sessionRepo->get($systemId);
        if (!$systemSession) {
            // Create system session manually
            $db = get_db();
            $now = (new DateTime())->format(DateTime::ATOM);
            $stmt = $db->prepare('INSERT OR REPLACE INTO sessions (id, name, created_at) VALUES (:id, :name, :created_at)');
            $stmt->execute([
                ':id' => $systemId,
                ':name' => $systemName,
                ':created_at' => $now
            ]);
        }

        // Add version message from captain's bridge
        $versionText = "Версия {$version}";
        $message = $this->msgRepo->add($systemId, $systemName, $versionText);

        // Broadcast new message
        $this->broadcastService->messageNew($message);

        return ['success' => true, 'version' => $version];
    }
}
