#!/bin/bash
# Pavilion Test Runner

set -e

echo "=== Pavilion Test Suite ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project directory
cd "$(dirname "$0")"

# Check if vendor exists
if [ ! -d "vendor" ]; then
    echo -e "${YELLOW}⚠ vendor/ not found. Running composer install...${NC}"
    composer install
    echo ""
fi

# Run PHP tests
echo "=== PHP Unit Tests ==="
./vendor/bin/phpunit tests/php --testdox --colors=always

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All PHP tests passed!${NC}"
else
    echo ""
    echo -e "${RED}✗ Some PHP tests failed${NC}"
    exit 1
fi

# TODO: Add JS tests when ready
# echo ""
# echo "=== JavaScript Tests ==="
# npm test

echo ""
echo -e "${GREEN}=== All tests completed ===${NC}"
