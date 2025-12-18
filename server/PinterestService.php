<?php
// server/PinterestService.php

class PinterestService {
    
    public function parsePinterestUrl(string $text): ?array {
        // Match Pinterest board URLs: pinterest.com/username/board-name/
        // or ca.pinterest.com, br.pinterest.com, etc.
        if (preg_match('~(?:https?://)?(?:[a-z]{2}\.)?pinterest\.com/([^/\s]+)/([^/\s?#]+)/?~i', $text, $matches)) {
            return [
                'username' => $matches[1],
                'slug' => $matches[2],
                'url' => $matches[0]
            ];
        }
        return null;
    }

    public function formatBoardTitle(string $slug): string {
        // Convert slug to title: "empathy-girl" -> "Empathy Girl"
        $words = explode('-', $slug);
        $title = array_map('ucfirst', $words);
        return implode(' ', $title);
    }

    public function enrichMessage(string $text): ?array {
        $pinterestUrl = $this->parsePinterestUrl($text);
        
        if (!$pinterestUrl) {
            return null;
        }

        $title = $this->formatBoardTitle($pinterestUrl['slug']);

        return [
            'type' => 'pinterest',
            'title' => $title,
            'url' => $pinterestUrl['url']
        ];
    }
}
