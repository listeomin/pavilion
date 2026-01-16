<?php
// api/dm.php - Direct Messages API
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../server/db.php';

$action = $_GET['action'] ?? '';

// Check authorization
$currentUserId = $_SESSION['telegram_user']['user_id'] ?? null;
if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$db = get_db();

switch ($action) {
    case 'get_users':
        // Get all users except current user (exclude system users like developer)
        $stmt = $db->prepare('
            SELECT u.id, u.telegram_id, u.telegram_username, u.telegram_first_name
            FROM users u
            WHERE u.id != :current_user_id
            AND u.telegram_id > 0
            ORDER BY u.telegram_first_name ASC
        ');
        $stmt->execute([':current_user_id' => $currentUserId]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get emojis from animal_profiles (separate DB)
        try {
            $animalDb = new PDO('sqlite:' . __DIR__ . '/../data/animal.sqlite');
            $animalDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            foreach ($users as &$user) {
                $stmt = $animalDb->prepare('SELECT emoji FROM animal_profiles WHERE user_id = :user_id ORDER BY updated_at DESC LIMIT 1');
                $stmt->execute([':user_id' => $user['id']]);
                $profile = $stmt->fetch(PDO::FETCH_ASSOC);
                $user['emoji'] = $profile ? $profile['emoji'] : '👤';
            }
        } catch (Exception $e) {
            // If error, set default emoji for all
            foreach ($users as &$user) {
                $user['emoji'] = '👤';
            }
        }

        echo json_encode([
            'success' => true,
            'users' => array_map(function($user) {
                return [
                    'id' => $user['id'],
                    'telegramId' => $user['telegram_id'],
                    'username' => $user['telegram_username'] ?: $user['telegram_id'],
                    'firstName' => $user['telegram_first_name'],
                    'emoji' => $user['emoji']
                ];
            }, $users)
        ]);
        break;

    case 'get_messages':
        $recipientId = $_GET['recipient_id'] ?? null;
        if (!$recipientId) {
            echo json_encode(['error' => 'Missing recipient_id']);
            exit;
        }

        // Get messages between current user and recipient
        $stmt = $db->prepare('
            SELECT dm.*,
                   u_from.telegram_username as from_username,
                   u_from.telegram_first_name as from_first_name
            FROM direct_messages dm
            LEFT JOIN users u_from ON dm.from_user_id = u_from.id
            WHERE (dm.from_user_id = :user1 AND dm.to_user_id = :user2)
               OR (dm.from_user_id = :user2 AND dm.to_user_id = :user1)
            ORDER BY dm.created_at ASC
        ');
        $stmt->execute([
            ':user1' => $currentUserId,
            ':user2' => $recipientId
        ]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'messages' => array_map(function($msg) use ($currentUserId) {
                return [
                    'id' => $msg['id'],
                    'fromUserId' => $msg['from_user_id'],
                    'toUserId' => $msg['to_user_id'],
                    'text' => $msg['text'],
                    'metadata' => $msg['metadata'] ? json_decode($msg['metadata'], true) : null,
                    'createdAt' => $msg['created_at'],
                    'fromMe' => $msg['from_user_id'] == $currentUserId,
                    'fromUsername' => $msg['from_username'],
                    'fromFirstName' => $msg['from_first_name']
                ];
            }, $messages)
        ]);
        break;

    case 'send':
        $input = json_decode(file_get_contents('php://input'), true);
        $recipientId = $input['recipient_id'] ?? null;
        $text = $input['text'] ?? '';
        $metadata = $input['metadata'] ?? null;

        if (!$recipientId || (!$text && !$metadata)) {
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }

        // Prevent messaging yourself
        if ($recipientId == $currentUserId) {
            echo json_encode(['error' => 'Cannot message yourself']);
            exit;
        }

        // Prepare metadata JSON
        $metadataJson = $metadata ? json_encode($metadata) : null;

        // Insert message
        $stmt = $db->prepare('
            INSERT INTO direct_messages (from_user_id, to_user_id, text, metadata, created_at)
            VALUES (:from_user_id, :to_user_id, :text, :metadata, datetime(\'now\'))
        ');
        $result = $stmt->execute([
            ':from_user_id' => $currentUserId,
            ':to_user_id' => $recipientId,
            ':text' => $text,
            ':metadata' => $metadataJson
        ]);

        if ($result) {
            $messageId = $db->lastInsertId();

            // Get the inserted message
            $stmt = $db->prepare('
                SELECT dm.*,
                       u_from.telegram_username as from_username,
                       u_from.telegram_first_name as from_first_name
                FROM direct_messages dm
                LEFT JOIN users u_from ON dm.from_user_id = u_from.id
                WHERE dm.id = :id
            ');
            $stmt->execute([':id' => $messageId]);
            $msg = $stmt->fetch(PDO::FETCH_ASSOC);

            // Check if recipient is AI agent
            $aiConfig = require __DIR__ . '/../../server/ai_agent_config.php';
            if ($aiConfig['enabled'] && $recipientId == $aiConfig['user_id']) {
                // Send message to TimeWeb AI Agent
                try {
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
                                ['role' => 'user', 'content' => $text]
                            ]
                        ])
                    ]);

                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $curlError = curl_error($ch);
                    curl_close($ch);

                    // Log for debugging
                    error_log('[AI Agent] HTTP Code: ' . $httpCode);
                    error_log('[AI Agent] Response: ' . substr($response, 0, 500));
                    if ($curlError) {
                        error_log('[AI Agent] cURL Error: ' . $curlError);
                    }

                    if ($httpCode === 200 && $response) {
                        $responseData = json_decode($response, true);

                        // Extract AI response text
                        $aiResponse = $responseData['choices'][0]['message']['content'] ?? null;

                        if ($aiResponse) {
                            // Check if user asked AI to write to its nest
                            $writeToNest = preg_match('/(напиши|расскажи|опиши).*(в|своё|своем|твоё|твоем).*(гнезд|nest)/ui', $text);

                            if ($writeToNest) {
                                // Save AI response to nest_content
                                try {
                                    // Parse AI response as Editor.js content
                                    // Wrap plain text in paragraph blocks
                                    $paragraphs = explode("\n\n", trim($aiResponse));
                                    $blocks = [];

                                    foreach ($paragraphs as $para) {
                                        if (!empty(trim($para))) {
                                            $blocks[] = [
                                                'id' => uniqid(),
                                                'type' => 'paragraph',
                                                'data' => [
                                                    'text' => trim($para)
                                                ]
                                            ];
                                        }
                                    }

                                    $editorContent = [
                                        'time' => time() * 1000,
                                        'blocks' => $blocks,
                                        'version' => '2.22.2'
                                    ];

                                    $now = date('Y-m-d H:i:s');
                                    $stmt = $db->prepare('
                                        INSERT INTO nest_content (user_id, content, created_at, updated_at)
                                        VALUES (:user_id, :content, :created_at, :updated_at)
                                        ON CONFLICT(user_id) DO UPDATE SET
                                            content = :content,
                                            updated_at = :updated_at
                                    ');
                                    $stmt->execute([
                                        ':user_id' => $recipientId,
                                        ':content' => json_encode($editorContent),
                                        ':created_at' => $now,
                                        ':updated_at' => $now
                                    ]);

                                    error_log('[AI Agent] Saved to nest for user_id: ' . $recipientId);
                                } catch (Exception $e) {
                                    error_log('[AI Agent] Nest save error: ' . $e->getMessage());
                                }
                            }

                            // Save AI response as message from agent
                            $stmt = $db->prepare('
                                INSERT INTO direct_messages (from_user_id, to_user_id, text, created_at)
                                VALUES (:from_user_id, :to_user_id, :text, datetime(\'now\'))
                            ');
                            $stmt->execute([
                                ':from_user_id' => $recipientId,
                                ':to_user_id' => $currentUserId,
                                ':text' => $aiResponse
                            ]);

                            // If wrote to nest, send confirmation message
                            if ($writeToNest) {
                                $stmt = $db->prepare('
                                    INSERT INTO direct_messages (from_user_id, to_user_id, text, created_at)
                                    VALUES (:from_user_id, :to_user_id, :text, datetime(\'now\'))
                                ');
                                $stmt->execute([
                                    ':from_user_id' => $recipientId,
                                    ':to_user_id' => $currentUserId,
                                    ':text' => '✍️ Записала в своё гнездо!'
                                ]);
                            }
                        }
                    }
                } catch (Exception $e) {
                    error_log('[AI Agent] Error: ' . $e->getMessage());
                }
            }

            echo json_encode([
                'success' => true,
                'message' => [
                    'id' => $msg['id'],
                    'fromUserId' => $msg['from_user_id'],
                    'toUserId' => $msg['to_user_id'],
                    'text' => $msg['text'],
                    'metadata' => $msg['metadata'] ? json_decode($msg['metadata'], true) : null,
                    'createdAt' => $msg['created_at'],
                    'fromMe' => true,
                    'fromUsername' => $msg['from_username'],
                    'fromFirstName' => $msg['from_first_name']
                ]
            ]);
        } else {
            echo json_encode(['error' => 'Failed to send message']);
        }
        break;

    default:
        echo json_encode(['error' => 'Invalid action']);
}
