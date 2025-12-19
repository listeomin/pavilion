#!/bin/bash
cd "$(dirname "$0")"
./vendor/bin/phpunit tests/php --testdox --colors=always
