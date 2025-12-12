<?php
// test_github_api.php
require_once __DIR__ . '/server/GitHubService.php';

$service = new GitHubService();
$metadata = $service->enrichMessage('https://github.com/listeomin/musceler');

echo "Result:\n";
print_r($metadata);
