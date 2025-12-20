#!/bin/bash
# Все тесты: PHP + JS
cd "$(dirname "$0")"

echo "=== PHP тесты ==="
./vendor/bin/phpunit tests/php --testdox --colors=always

echo ""
echo "=== JS тесты ==="
npm test
