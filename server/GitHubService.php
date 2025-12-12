<?php
// server/GitHubService.php

class GitHubService {
    private const API_BASE = 'https://api.github.com';
    private const TIMEOUT = 5;

    public function parseGitHubUrl(string $text): ?array {
        // Match GitHub repo URLs: github.com/owner/repo
        if (preg_match('~github\.com/([^/\s]+)/([^\s?#/]+)~i', $text, $matches)) {
            return [
                'owner' => $matches[1],
                'repo' => $matches[2]
            ];
        }
        return null;
    }

    public function fetchRepoMetadata(string $owner, string $repo): ?array {
        $url = self::API_BASE . '/repos/' . urlencode($owner) . '/' . urlencode($repo);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: Pavilion-Chat',
                    'Accept: application/vnd.github.v3+json'
                ],
                'timeout' => self::TIMEOUT,
                'ignore_errors' => true
            ]
        ]);

        $response = @file_get_contents($url, false, $context);
        
        if ($response === false) {
            return null;
        }

        $data = json_decode($response, true);
        
        if (!$data || isset($data['message'])) {
            return null;
        }

        return [
            'type' => 'github',
            'owner' => $data['owner']['login'] ?? $owner,
            'repo' => $data['name'] ?? $repo,
            'description' => $data['description'] ?? '',
            'language' => $data['language'] ?? null,
            'stars' => $data['stargazers_count'] ?? 0,
            'forks' => $data['forks_count'] ?? 0,
            'avatar' => $data['owner']['avatar_url'] ?? null,
            'url' => $data['html_url'] ?? "https://github.com/{$owner}/{$repo}"
        ];
    }

    public function enrichMessage(string $text): ?array {
        $githubUrl = $this->parseGitHubUrl($text);
        
        if (!$githubUrl) {
            return null;
        }

        return $this->fetchRepoMetadata($githubUrl['owner'], $githubUrl['repo']);
    }
}
