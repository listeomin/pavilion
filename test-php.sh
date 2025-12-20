#!/bin/bash
# PHP тесты
cd "$(dirname "$0")"
./vendor/bin/phpunit tests/php --testdox --colors=always
