<?php
// server/BroadcastService.php

class BroadcastService {
    private string $wsUrl;
    
    public function __construct(string $wsUrl = 'http://localhost:3001') {
        $this->wsUrl = $wsUrl;
    }
    
    public function emit(string $event, array $data, string $room = 'public'): bool {
        try {
            $payload = json_encode([
                'event' => $event,
                'data' => $data,
                'room' => $room
            ]);
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => $payload,
                    'timeout' => 0.1 // 100ms timeout - fast fail if WS down
                ]
            ]);
            
            $result = @file_get_contents("{$this->wsUrl}/broadcast", false, $context);
            return $result !== false;
        } catch (Exception $e) {
            error_log("Broadcast failed: {$e->getMessage()}");
            return false;
        }
    }
    
    public function messageNew(array $message): bool {
        return $this->emit('message_new', $message);
    }
    
    public function messageUpdated(array $message): bool {
        return $this->emit('message_updated', $message);
    }
}
