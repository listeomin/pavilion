<?php
// server/ApiHandler.php

class ApiHandler {
    private SessionRepository $sessionRepo;
    private MessageRepository $msgRepo;
    private GitHubService $githubService;
    private PinterestService $pinterestService;
    private NestPreviewService $nestPreviewService;
    private YouTubePreviewService $youtubeService;
    private LinkPreviewService $linkPreviewService;
    private ImageUploadService $imageService;
    private BroadcastService $broadcastService;

    public function __construct(
        ?SessionRepository $sessionRepo = null,
        ?MessageRepository $msgRepo = null,
        ?GitHubService $githubService = null,
        ?PinterestService $pinterestService = null,
        ?NestPreviewService $nestPreviewService = null,
        ?YouTubePreviewService $youtubeService = null,
        ?LinkPreviewService $linkPreviewService = null,
        ?ImageUploadService $imageService = null,
        ?BroadcastService $broadcastService = null
    ) {
        $this->sessionRepo = $sessionRepo ?? new SessionRepository();
        $this->msgRepo = $msgRepo ?? new MessageRepository();
        $this->githubService = $githubService ?? new GitHubService();
        $this->pinterestService = $pinterestService ?? new PinterestService();
        $this->nestPreviewService = $nestPreviewService ?? new NestPreviewService();
        $this->youtubeService = $youtubeService ?? new YouTubePreviewService();
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
        $pageContext = $input['page'] ?? null;

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

        // Check if this is the first message from this session (for owl greeting)
        $db = get_db();
        $stmt = $db->prepare('SELECT COUNT(*) as count FROM messages WHERE session_id = :session_id');
        $stmt->execute([':session_id' => $session_id]);
        $messageCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        $isFirstMessage = ($messageCount == 0);

        // Priority: client metadata > Pinterest > Nest > GitHub > generic link preview
        // NOTE: YouTube enrichment is disabled - handled by frontend for instant sending
        $metadata = $clientMetadata;
        if (!$metadata) {
            $metadata = $this->pinterestService->enrichMessage($text);
        }
        if (!$metadata) {
            $metadata = $this->nestPreviewService->enrichMessage($text);
        }
        // YouTube enrichment disabled - frontend handles it
        // if (!$metadata) {
        //     $metadata = $this->youtubeService->enrichMessage($text);
        // }
        if (!$metadata) {
            $metadata = $this->githubService->enrichMessage($text);
        }
        if (!$metadata) {
            $metadata = $this->linkPreviewService->enrichMessage($text);
        }

        $message = $this->msgRepo->add($session_id, $session['name'], $text, $metadata);
        $this->broadcastService->messageNew($message);

        // Check if message mentions @сова (Owl AI agent)
        $owlMentioned = preg_match('/@сова/ui', $text);
        file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - Text: " . $text . "\n", FILE_APPEND);
        file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - Owl mentioned: " . ($owlMentioned ? 'YES' : 'NO') . "\n", FILE_APPEND);
        if ($owlMentioned) {
            try {
                $aiConfig = require __DIR__ . '/ai_agent_config.php';
                if ($aiConfig['enabled']) {
                    // Extract the message text for the AI
                    $aiPrompt = preg_replace('/@сова,?\s*/ui', '', $text);
                    $aiPrompt = trim($aiPrompt);

                    if (!empty($aiPrompt)) {
                        // Check for license/agreement keywords (various spellings)
                        $isLicenseRequest = preg_match('/лиценз|согла[шщ]ен|покаж.*лиц/ui', $aiPrompt);
                        file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - AI Prompt: " . $aiPrompt . "\n", FILE_APPEND);
                        file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - Is license: " . ($isLicenseRequest ? 'YES' : 'NO') . "\n", FILE_APPEND);

                        if ($isLicenseRequest) {
                            file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - Sending license response\n", FILE_APPEND);
                            try {
                                // Respond with link to license agreement
                                $basePath = (strpos($_SERVER['REQUEST_URI'] ?? '', '/pavilion/') === 0) ? '/pavilion' : '';

                                // Detect domain from HTTP_HOST
                                $host = $_SERVER['HTTP_HOST'] ?? 'hhrrr.ru';
                                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                                $licenseUrl = $protocol . '://' . $host . $basePath . '/doc/';

                                $owlResponse = "Конечно! Лицензионное соглашение доступно здесь:\n[Лицензионное соглашение]({$licenseUrl})\n\nВы можете ознакомиться с условиями использования нашего продукта и скачать документ в формате PDF.";

                                file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - Calling msgRepo->add\n", FILE_APPEND);
                                $owlMessage = $this->msgRepo->add(
                                    $session_id,  // Use current session, not 'owl_ai_session'
                                    '🦉 сова',
                                    $owlResponse,
                                    null
                                );
                                file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - Message created: " . json_encode($owlMessage) . "\n", FILE_APPEND);

                                $this->broadcastService->messageNew($owlMessage);
                                file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - Broadcast sent\n", FILE_APPEND);

                                // Return success without calling TimeWeb API
                                return $this->json(['success' => true, 'message' => 'License info sent']);
                            } catch (Exception $e) {
                                file_put_contents('/tmp/owl_debug.log', date('Y-m-d H:i:s') . " - ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
                                // Continue to regular AI if license sending failed
                            }
                        } else {
                            // Regular AI request
                            $ch = curl_init();
                        curl_setopt_array($ch, [
                            CURLOPT_URL => $aiConfig['api_endpoint'],
                            CURLOPT_RETURNTRANSFER => true,
                            CURLOPT_POST => true,
                            CURLOPT_HTTPHEADER => [
                                'Authorization: Bearer ' . $aiConfig['api_token'],
                                'Content-Type: application/json'
                            ],
                            CURLOPT_POSTFIELDS => json_encode([
                                'model' => 'agent-' . $aiConfig['agent_id'],
                                'messages' => [
                                    ['role' => 'user', 'content' => $aiPrompt]
                                ]
                            ])
                        ]);

                        $response = curl_exec($ch);
                        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);

                        if ($httpCode === 200 && $response) {
                            $responseData = json_decode($response, true);
                            $aiResponse = $responseData['choices'][0]['message']['content'] ?? null;

                            if ($aiResponse) {
                                // Add AI response as message from Owl
                                $owlMessage = $this->msgRepo->add(
                                    $session_id,  // Use current session, not 'owl_ai_session'
                                    '🦉 сова',
                                    $aiResponse,
                                    null
                                );
                                $this->broadcastService->messageNew($owlMessage);
                            }
                        }
                        } // end of else block (regular AI request)
                    }
                }
            } catch (Exception $e) {
                error_log('[AI Agent @mention] Error: ' . $e->getMessage());
            }
        }

        // Greet new users on main page (only if not already mentioned @сова)
        // Check if this is main page (index.php)
        $isMainPage = ($pageContext === 'main') ||
                      (isset($_SERVER['HTTP_REFERER']) &&
                       (strpos($_SERVER['HTTP_REFERER'], '/pavilion/') !== false &&
                        strpos($_SERVER['HTTP_REFERER'], '/pavilion/index.php') !== false ||
                        preg_match('#/pavilion/?$#', $_SERVER['HTTP_REFERER'])));

        if ($isFirstMessage && $isMainPage && !$owlMentioned) {
            try {
                $aiConfig = require __DIR__ . '/ai_agent_config.php';
                if ($aiConfig['enabled']) {
                    // Greet the new user
                    $greetingPrompt = "Новый участник с именем \"{$session['name']}\" только что присоединился к чату и написал: \"{$text}\". Поприветствуй его дружелюбно и кратко (1-2 предложения).";

                    $ch = curl_init();
                    curl_setopt_array($ch, [
                        CURLOPT_URL => $aiConfig['api_endpoint'],
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_POST => true,
                        CURLOPT_HTTPHEADER => [
                            'Authorization: Bearer ' . $aiConfig['api_token'],
                            'Content-Type: application/json'
                        ],
                        CURLOPT_POSTFIELDS => json_encode([
                            'model' => 'agent-' . $aiConfig['agent_id'],
                            'messages' => [
                                ['role' => 'user', 'content' => $greetingPrompt]
                            ]
                        ])
                    ]);

                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($httpCode === 200 && $response) {
                        $responseData = json_decode($response, true);
                        $aiResponse = $responseData['choices'][0]['message']['content'] ?? null;

                        if ($aiResponse) {
                            // Add the reminder about @сова
                            $greetingWithReminder = $aiResponse . "\n\nВы можете позвать меня через @сова, что бы я вам ответила";

                            // Add greeting as message from Owl
                            $owlMessage = $this->msgRepo->add(
                                $session_id,  // Use current session, not 'owl_ai_session'
                                '🦉 сова',
                                $greetingWithReminder,
                                null
                            );
                            $this->broadcastService->messageNew($owlMessage);
                        }
                    }
                }
            } catch (Exception $e) {
                error_log('[AI Agent greeting] Error: ' . $e->getMessage());
            }
        }

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

        // Priority: client metadata > Pinterest > Nest > GitHub > generic link preview
        // NOTE: YouTube enrichment is disabled - handled by frontend for instant sending
        $metadata = $clientMetadata;
        if (!$metadata) {
            $metadata = $this->pinterestService->enrichMessage($text);
        }
        if (!$metadata) {
            $metadata = $this->nestPreviewService->enrichMessage($text);
        }
        // YouTube enrichment disabled - frontend handles it
        // if (!$metadata) {
        //     $metadata = $this->youtubeService->enrichMessage($text);
        // }
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

    public function deleteMessage(array $input): array {
        $session_id = $input['session_id'] ?? null;
        $message_id = $input['message_id'] ?? null;

        if (!$session_id || !$message_id) {
            throw new InvalidArgumentException('session_id and message_id required');
        }

        $session = $this->sessionRepo->get($session_id);
        if (!$session) {
            throw new RuntimeException('invalid session');
        }

        $deleted = $this->msgRepo->delete($message_id, $session['name']);

        if (!$deleted) {
            throw new RuntimeException('message not found or unauthorized');
        }

        $this->broadcastService->messageDeleted($message_id);
        return ['success' => true, 'message_id' => $message_id];
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
