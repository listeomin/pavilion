# Versioning System for Мурмурация (Pavilion)

## Overview

This project uses Semantic Versioning to track changes. Version information is maintained in two locations and displayed to users when the database is reset.

## Version Format

**Format**: `MAJOR.MINOR.PATCH` (e.g., `0.8.0`)

Currently, we're in `0.x.x` (pre-1.0 development):
- **MAJOR** (0): Pre-release, stays at 0 until public launch
- **MINOR**: Incremented for new features, significant changes, or multiple related tasks
- **PATCH**: Reserved for bug fixes only (currently we increment MINOR for all task completions)

## Files to Update

When a task is marked as completed (✅ Task is Done), update version in **TWO** locations:

### 1. `/public/js/version.json`

This is the **source of truth** for version information.

**Structure**:
```json
{
  "version": "0.8.0",
  "lastUpdated": "2025-12-25",
  "changelog": [
    {
      "version": "0.8.0",
      "date": "2025-12-25",
      "type": "feature",
      "tasks": [
        "Task description 1",
        "Task description 2"
      ]
    }
  ]
}
```

**Fields**:
- `version`: Current version number
- `lastUpdated`: Date of last version update (YYYY-MM-DD)
- `changelog`: Array of version entries (newest first)
  - `version`: Version number for this entry
  - `date`: Release date (YYYY-MM-DD)
  - `type`: Either `"feature"` or `"bugfix"`
  - `tasks`: Array of task descriptions in Russian

### 2. `/public/js/config.js`

Update the VERSION constant to match version.json:

```javascript
// Version info (update when version.json changes)
export const VERSION = '0.8.0';
```

Also update in the CONFIG object:
```javascript
export const CONFIG = {
  BASE_PATH: BASE_PATH,
  API_PATH: BASE_PATH + '/server/api.php',
  WS_URL: `${WS_PROTOCOL}//${WS_HOST}${WS_PATH}`,
  VERSION: VERSION  // <-- Ensure this matches
};
```

## When to Update Version

### Update MINOR version (0.X.0) when:
- New feature is implemented
- Multiple related tasks are completed
- Significant changes to existing functionality
- User-facing improvements

### Update PATCH version (0.7.X) when:
- Bug fixes only
- Minor corrections
- No new functionality added

### Examples from changelog:

**v0.8.0** (MINOR bump):
- Implemented versioning system (new feature)
- Added logout button (new feature)
- Created text-button class (infrastructure)

**v0.7.0** (MINOR bump):
- Fixed image stretching (improvement)
- Removed gradient overlay (improvement)
- Images show at original size (behavior change)

**v0.6.0** (MINOR bump):
- Auto-update animal after auth (new feature)
- Session reinitialization (new feature)
- WebSocket reconnection (new feature)

## How to Update

When user says **"✅ Task is Done!"** or similar confirmation:

1. **Determine version bump**:
   - Feature/improvement → Increment MINOR (0.7.0 → 0.8.0)
   - Bug fix → Increment PATCH (0.7.0 → 0.7.1)

2. **Update version.json**:
   - Change `version` field
   - Update `lastUpdated` to current date
   - Add new entry to top of `changelog` array
   - Describe completed tasks in Russian

3. **Update config.js**:
   - Change `VERSION` constant to match
   - Update `VERSION` in CONFIG object

4. **Verify**:
   - Both files have matching version numbers
   - Changelog entry accurately describes what was done
   - Date is current

## Where Version is Displayed

**Database Reset (/rebase command)**:
- When user executes `/rebase`, the database is cleared
- Script `clear_and_seed.php` reads `public/js/version.json`
- Creates system message showing version:
  ```
  Жизнь с чистого листа 🍃
  Последнее обновление [date and time]
  Версия 0.8.0
  ```

**JavaScript console**:
- Version can be accessed via `CONFIG.VERSION` in any module
- Can be logged on app initialization if needed

## Example Update Process

User completes Task 9 - implementing dark mode:

1. **Edit version.json**:
```json
{
  "version": "0.9.0",  // ← Incremented from 0.8.0
  "lastUpdated": "2025-12-26",  // ← Updated date
  "changelog": [
    {
      "version": "0.9.0",  // ← New entry added
      "date": "2025-12-26",
      "type": "feature",
      "tasks": [
        "Реализован переключатель темной темы",
        "Добавлены CSS переменные для темной темы",
        "Сохранение предпочтения темы в localStorage"
      ]
    },
    {
      "version": "0.8.0",  // ← Previous entries remain
      "date": "2025-12-25",
      // ... rest of entry
    }
  ]
}
```

2. **Edit config.js**:
```javascript
export const VERSION = '0.9.0';  // ← Updated to match

export const CONFIG = {
  // ...
  VERSION: VERSION  // ← Automatically matches
};
```

3. **Confirm to user**: "Версия обновлена до 0.9.0"

## Important Notes

- **Always update both files** (version.json + config.js)
- **Keep changelog in Russian** - matches project language
- **Newest entries first** in changelog array
- **Use date format YYYY-MM-DD** for consistency
- **Include all completed tasks** in the version entry
- Version is automatically displayed when `/rebase` is run
- No need to update version.json manually in git commits - AI handles this

## Questions?

If uncertain about version bumping:
- Default to MINOR increment for completed tasks
- Group related tasks into single version
- Ask user if major architectural changes warrant discussion
