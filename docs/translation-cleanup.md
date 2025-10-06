# Translation Cleanup

This project includes an automated system to keep translation files clean and
synchronized.

## Overview

The translation cleanup system automatically:

- ✅ Identifies unused translation keys by analyzing the codebase
- ✅ Removes unused keys from both English and Portuguese translation files
- ✅ Reorders Portuguese keys to match the English file structure
- ✅ Ensures both files are perfectly synchronized

## How it works

### Automatic Cleanup (Pre-commit Hook)

Every time you commit, the pre-commit hook automatically runs
`scripts/clean-translations.js` which:

1. **Scans the codebase** for all `t("key")` usage patterns
2. **Compares** used keys against all keys in translation files
3. **Removes unused keys** from both EN and PT files
4. **Reorders** Portuguese file to match English structure
5. **Adds cleaned files** to the commit automatically

### Manual Cleanup

You can also run the cleanup manually:

```bash
# Run translation cleanup
yarn clean:translations

# Or run the script directly
node scripts/clean-translations.js
```

## What gets cleaned up

The script removes translation keys that are:

- ❌ Not referenced anywhere in the codebase
- ❌ Not used in any `t("key")` calls
- ❌ Legacy keys from removed features
- ❌ Duplicate or redundant keys

## Benefits

- 🧹 **Cleaner files**: Removes 25%+ unused keys automatically
- 🔄 **Always synchronized**: EN and PT files stay perfectly aligned
- 🚀 **Faster builds**: Smaller translation files load faster
- 🛡️ **No manual work**: Automatic cleanup on every commit
- 📊 **Better maintainability**: Only active translations are kept

## Configuration

### Pre-commit Hook

Located at `.husky/pre-commit`, this hook runs automatically on every commit.

### Script Location

The main cleanup script is at `scripts/clean-translations.js`.

### Package Script

Added `yarn clean:translations` command to package.json for manual execution.

## Example Output

```
🧹 Starting translation cleanup...
📖 Extracting used translation keys from codebase...
✅ Found 625 used translation keys
🗑️  Found 15 unused keys in EN and 12 unused keys in PT
✅ Cleanup complete!
   English keys: 617
   Portuguese keys: 617
   Removed: 17 unused keys
✨ Translation files are perfectly synchronized!
```

## Troubleshooting

If the cleanup fails:

1. Check that translation files exist at `src/i18n/locales/en/translations.json`
   and `src/i18n/locales/pt/translations.json`
2. Ensure the codebase contains valid `t("key")` patterns
3. Run `yarn clean:translations` manually to see detailed error messages

## Disabling Auto-cleanup

To disable automatic cleanup, remove or rename `.husky/pre-commit`.
