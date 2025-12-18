<?php
// server/LinkPreviewService.php

class LinkPreviewService {
    private const TIMEOUT = 5;
    
    public function parseUrls(string $text): array {
        $urls = [];
        if (preg_match_all('~(https?://[^\s<>"]+)~i', $text, $matches)) {
            foreach ($matches[1] as $url) {
                $urls[] = $url;
            }
        }
        return $urls;
    }
    
    public function extractDomain(string $url): string {
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? '';
        return preg_replace('/^www\./', '', $host);
    }
    
    public function fetchPageTitle(string $url): ?string {
        error_log("LinkPreview: Fetching title for $url");
        
        // Use curl instead of file_get_contents
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, self::TIMEOUT);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $html = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($html === false || $httpCode !== 200) {
            error_log("LinkPreview: Failed to fetch $url (HTTP $httpCode) - $error");
            return null;
        }

        error_log("LinkPreview: Fetched " . strlen($html) . " bytes");

        // Try Open Graph title first
        if (preg_match('~<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']~i', $html, $matches)) {
            $title = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            error_log("LinkPreview: Found OG title: $title");
            return $title;
        }
        
        // Fallback to <title> tag
        if (preg_match('~<title>(.*?)</title>~is', $html, $matches)) {
            $title = trim($matches[1]);
            $title = html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            error_log("LinkPreview: Found <title>: $title");
            return $title;
        }
        
        error_log("LinkPreview: No title found");
        return null;
    }
    
    public function enrichMessage(string $text): ?array {
        error_log("LinkPreview: enrichMessage called with: $text");
        
        $urls = $this->parseUrls($text);
        
        if (empty($urls)) {
            error_log("LinkPreview: No URLs found");
            return null;
        }
        
        $url = $urls[0];
        error_log("LinkPreview: Processing URL: $url");
        
        $domain = $this->extractDomain($url);
        $title = $this->fetchPageTitle($url);
        
        if (!$title) {
            error_log("LinkPreview: No title found, returning null");
            return null;
        }
        
        $result = [
            'type' => 'link',
            'domain' => $domain,
            'title' => $title,
            'url' => $url
        ];
        
        error_log("LinkPreview: Returning metadata: " . json_encode($result));
        return $result;
    }
}
