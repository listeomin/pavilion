<?php
// server/EditorJsRenderer.php - Render Editor.js blocks to HTML for SEO and Instant View

class EditorJsRenderer {
    /**
     * Render Editor.js JSON content to HTML
     * @param string $jsonContent - Editor.js JSON
     * @return string HTML
     */
    public static function render($jsonContent) {
        $data = json_decode($jsonContent, true);

        if (!$data || !isset($data['blocks'])) {
            return '';
        }

        $html = '';

        foreach ($data['blocks'] as $block) {
            $html .= self::renderBlock($block);
        }

        return $html;
    }

    /**
     * Render a single Editor.js block
     */
    private static function renderBlock($block) {
        $type = $block['type'] ?? 'paragraph';
        $data = $block['data'] ?? [];

        switch ($type) {
            case 'header':
                return self::renderHeader($data);
            case 'paragraph':
                return self::renderParagraph($data);
            case 'list':
                return self::renderList($data);
            case 'quote':
                return self::renderQuote($data);
            case 'delimiter':
                return self::renderDelimiter();
            case 'image':
                return self::renderImage($data);
            default:
                return '';
        }
    }

    /**
     * Render header block
     */
    private static function renderHeader($data) {
        $text = htmlspecialchars($data['text'] ?? '', ENT_QUOTES, 'UTF-8');
        $level = intval($data['level'] ?? 2);
        $level = max(1, min(6, $level)); // Clamp between 1-6

        return "<h{$level}>{$text}</h{$level}>\n";
    }

    /**
     * Render paragraph block
     */
    private static function renderParagraph($data) {
        $text = $data['text'] ?? '';
        // Don't escape - paragraph can contain HTML (links, bold, etc)
        return "<p>{$text}</p>\n";
    }

    /**
     * Render list block
     */
    private static function renderList($data) {
        $style = $data['style'] ?? 'unordered';
        $items = $data['items'] ?? [];

        if (empty($items)) {
            return '';
        }

        $tag = $style === 'ordered' ? 'ol' : 'ul';
        $html = "<{$tag}>\n";

        foreach ($items as $item) {
            $html .= "  <li>{$item}</li>\n";
        }

        $html .= "</{$tag}>\n";

        return $html;
    }

    /**
     * Render quote block
     */
    private static function renderQuote($data) {
        $text = $data['text'] ?? '';
        $caption = $data['caption'] ?? '';

        $html = "<blockquote>\n";
        $html .= "  <p>{$text}</p>\n";

        if ($caption) {
            $html .= "  <footer>{$caption}</footer>\n";
        }

        $html .= "</blockquote>\n";

        return $html;
    }

    /**
     * Render delimiter block
     */
    private static function renderDelimiter() {
        return "<hr />\n";
    }

    /**
     * Render image block
     */
    private static function renderImage($data) {
        $url = $data['file']['url'] ?? '';

        if (!$url) {
            return '';
        }

        // Fix http to https for hhrrr.ru
        $url = preg_replace('#^http://hhrrr\.ru#', 'https://hhrrr.ru', $url);

        // Fix /pavilion/ prefix for murmuration.monster
        // Check if current host is murmuration.monster
        $host = $_SERVER['HTTP_HOST'] ?? '';
        if (strpos($host, 'murmuration.monster') !== false) {
            // Remove /pavilion prefix from URLs
            $url = preg_replace('#^/pavilion/#', '/', $url);
        }

        $escapedUrl = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');

        return "<figure>\n  <img src=\"{$escapedUrl}\" alt=\"\" />\n</figure>\n";
    }

    /**
     * Extract plain text from Editor.js content (for meta description)
     * @param string $jsonContent - Editor.js JSON
     * @param int $maxLength - Max length of text
     * @return string Plain text
     */
    public static function extractText($jsonContent, $maxLength = 200) {
        $data = json_decode($jsonContent, true);

        if (!$data || !isset($data['blocks'])) {
            return '';
        }

        $text = '';

        foreach ($data['blocks'] as $block) {
            $type = $block['type'] ?? 'paragraph';
            $data = $block['data'] ?? [];

            switch ($type) {
                case 'header':
                case 'paragraph':
                    $blockText = $data['text'] ?? '';
                    // Strip HTML tags
                    $blockText = strip_tags($blockText);
                    $text .= $blockText . ' ';
                    break;
                case 'list':
                    $items = $data['items'] ?? [];
                    foreach ($items as $item) {
                        $text .= strip_tags($item) . ' ';
                    }
                    break;
                case 'quote':
                    $blockText = $data['text'] ?? '';
                    $text .= strip_tags($blockText) . ' ';
                    break;
            }

            // Stop if we have enough text
            if (strlen($text) > $maxLength * 2) {
                break;
            }
        }

        $text = trim($text);

        if (strlen($text) > $maxLength) {
            // Use substr instead of mb_substr for compatibility
            $text = substr($text, 0, $maxLength) . '...';
        }

        return $text;
    }
}
