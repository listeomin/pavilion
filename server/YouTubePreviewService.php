<?php
// server/YouTubePreviewService.php

class YouTubePreviewService {

    public function enrichMessage(string $text): ?array {
        $videoId = $this->parseYouTubeUrl($text);
        if (!$videoId) {
            return null;
        }

        $metadata = $this->fetchYouTubeMetadata($videoId);
        return $metadata;
    }

    private function parseYouTubeUrl(string $text): ?string {
        $patterns = [
            '/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/',
            '/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/',
            '/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/'
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $matches)) {
                return $matches[1];
            }
        }

        return null;
    }

    private function fetchYouTubeMetadata(string $videoId): ?array {
        try {
            // Use yt-dlp to get video metadata using --print (lighter than --dump-json)
            $command = sprintf(
                '/usr/local/bin/yt-dlp --skip-download --no-warnings --print "%%(title)s|||%%(uploader)s|||%%(duration)s" "https://www.youtube.com/watch?v=%s" 2>&1',
                escapeshellarg($videoId)
            );

            $output = shell_exec($command);
            if (!$output) {
                error_log('[YouTube] Failed to get metadata for: ' . $videoId);
                return null;
            }

            // Check for critical errors (not warnings)
            if (stripos($output, 'ERROR:') !== false) {
                error_log('[YouTube] Error: ' . substr($output, 0, 200));
                return null;
            }

            // Parse output (title|||uploader|||duration)
            $lines = explode("\n", trim($output));
            $lastLine = end($lines); // Get last non-empty line (result)

            $parts = explode('|||', $lastLine);
            if (count($parts) < 2) {
                error_log('[YouTube] Failed to parse output: ' . substr($output, 0, 200));
                return null;
            }

            // Extract metadata
            $title = trim($parts[0]) ?: 'YouTube Video';
            $uploader = trim($parts[1]) ?: 'Unknown Artist';
            $duration = isset($parts[2]) ? (int)trim($parts[2]) : 0;
            $thumbnail = null;

            return [
                'type' => 'music',
                'artist' => $uploader,
                'track' => $title,
                'audioUrl' => '/api/music/youtube-stream.php?v=' . $videoId,
                'youtube_id' => $videoId,
                'duration' => $duration,
                'thumbnail' => $thumbnail
            ];

        } catch (Exception $e) {
            error_log('[YouTube] Error: ' . $e->getMessage());
            return null;
        }
    }
}
