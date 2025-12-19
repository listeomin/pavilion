# Running Tests

## Prerequisites

```bash
# Install dependencies
composer install
```

## Run all tests

```bash
# Simple way
./test.sh

# Or directly via PHPUnit
./vendor/bin/phpunit tests/php --testdox

# With coverage (requires xdebug)
./vendor/bin/phpunit tests/php --coverage-html coverage/
```

## Run specific test file

```bash
./vendor/bin/phpunit tests/php/MessageRepositoryTest.php --testdox
./vendor/bin/phpunit tests/php/SessionRepositoryTest.php --testdox
./vendor/bin/phpunit tests/php/ApiHandlerTest.php --testdox
```

## Expected Output

```
Pavilion Test Suite

MessageRepository
 ✔ Add returns message with correct structure
 ✔ Add saves metadata as json
 ✔ Get all returns all messages
 ✔ Get last page returns specified number of messages
 ✔ Get since id with null returns all messages
 ✔ Get since id returns only messages after id
 ✔ Get since id sorts by id asc
 ✔ Update updates own message
 ✔ Update returns null for other author message
 ✔ Update correctly updates text and metadata
 ✔ Metadata correctly deserialized when reading
 ✔ Message without metadata has no metadata key

SessionRepository
 ✔ Create generates unique id
 ✔ Get returns session or null
 ✔ Change name changes session name

ApiHandler
 ✔ Init creates new session and returns it
 ✔ Init returns last messages for new session
 ✔ Init returns existing session if cookie provided
 ✔ Init returns all messages for existing session
 ✔ Send requires session id
 ✔ Send saves text and metadata
 ✔ Send returns created message
 ✔ Send throws on invalid session
 ✔ Poll returns empty array without new messages
 ✔ Poll returns messages after id
 ✔ Update message requires session id and message id
 ✔ Update message checks authorization
 ✔ Update message returns updated message
 ✔ Change name changes session name
 ✔ Change name returns new name

✓ All tests passed!
```

## Troubleshooting

### "vendor/bin/phpunit not found"
Run `composer install` first.

### "Class 'BroadcastService' not found"
Make sure all service files are present in `server/` directory.

### Tests fail with "Cannot connect to WebSocket"
Tests should NOT connect to real WebSocket server - they use mocks.
If you see this error, check that `ApiHandlerTest` properly mocks `BroadcastService`.
