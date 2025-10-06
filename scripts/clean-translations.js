#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getKeys(obj, prefix = "") {
  const keys = [];
  for (const key in obj) {
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys.push(...getKeys(obj[key], prefix ? `${prefix}.${key}` : key));
    } else {
      keys.push(prefix ? `${prefix}.${key}` : key);
    }
  }
  return keys;
}

function removeKeys(obj, keysToRemove, prefix = "") {
  const result = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!keysToRemove.has(fullKey)) {
      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        const cleanedNested = removeKeys(obj[key], keysToRemove, fullKey);
        if (Object.keys(cleanedNested).length > 0) {
          result[key] = cleanedNested;
        }
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

function reorderObject(obj, referenceObj) {
  const result = {};

  // First add keys that exist in both objects, in the order they appear in reference
  for (const key in referenceObj) {
    if (obj.hasOwnProperty(key)) {
      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        result[key] = reorderObject(obj[key], referenceObj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  }

  // Then add any remaining keys from obj that don't exist in reference
  for (const key in obj) {
    if (!result.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  }

  return result;
}

function extractUsedKeys() {
  log("📖 Extracting used translation keys from codebase...", colors.blue);

  const { execSync } = require("child_process");

  try {
    // Extract translation keys used in the codebase
    const grepOutput = execSync(
      'grep -r "t(" src --include="*.ts" --include="*.tsx" | sed -n \'s/.*t("\\([^"]*\\)").*/\\1/p\' | sort | uniq',
      { encoding: "utf8" },
    );

    const usedKeys = new Set(
      grepOutput
        .split("\n")
        .filter((k) => k.trim() && !/^[0-9]/.test(k) && !/^[^a-zA-Z]/.test(k)),
    );

    log(`✅ Found ${usedKeys.size} used translation keys`, colors.green);
    return usedKeys;
  } catch (error) {
    log("❌ Failed to extract used keys from codebase", colors.red);
    log(error.message, colors.red);
    return new Set();
  }
}

function cleanTranslations() {
  log("🧹 Starting translation cleanup...", colors.cyan);

  const enPath = "src/i18n/locales/en/translations.json";
  const ptPath = "src/i18n/locales/pt/translations.json";

  // Check if translation files exist
  if (!fs.existsSync(enPath) || !fs.existsSync(ptPath)) {
    log("❌ Translation files not found", colors.red);
    return false;
  }

  try {
    // Read translation files
    const enTranslations = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const ptTranslations = JSON.parse(fs.readFileSync(ptPath, "utf8"));

    // Extract used keys
    const usedKeys = extractUsedKeys();

    // Get all keys from both files
    const enKeys = new Set(getKeys(enTranslations));
    const ptKeys = new Set(getKeys(ptTranslations));

    // Find unused keys
    const unusedEnKeys = [...enKeys].filter((key) => !usedKeys.has(key));
    const unusedPtKeys = [...ptKeys].filter((key) => !usedKeys.has(key));

    if (unusedEnKeys.length === 0 && unusedPtKeys.length === 0) {
      log(
        "✨ No unused keys found - translations are already clean!",
        colors.green,
      );
      return true;
    }

    log(
      `🗑️  Found ${unusedEnKeys.length} unused keys in EN and ${unusedPtKeys.length} unused keys in PT`,
      colors.yellow,
    );

    // Remove unused keys
    const unusedKeys = new Set([...unusedEnKeys, ...unusedPtKeys]);
    const cleanedEnTranslations = removeKeys(enTranslations, unusedKeys);
    const cleanedPtTranslations = removeKeys(ptTranslations, unusedKeys);

    // Reorder Portuguese file to match English structure
    const reorderedPtTranslations = reorderObject(
      cleanedPtTranslations,
      cleanedEnTranslations,
    );

    // Write cleaned files
    fs.writeFileSync(
      enPath,
      JSON.stringify(cleanedEnTranslations, null, 2) + "\n",
    );
    fs.writeFileSync(
      ptPath,
      JSON.stringify(reorderedPtTranslations, null, 2) + "\n",
    );

    // Verify results
    const finalEnKeys = new Set(getKeys(cleanedEnTranslations));
    const finalPtKeys = new Set(getKeys(reorderedPtTranslations));

    log(`✅ Cleanup complete!`, colors.green);
    log(`   English keys: ${finalEnKeys.size}`, colors.green);
    log(`   Portuguese keys: ${finalPtKeys.size}`, colors.green);
    log(`   Removed: ${unusedKeys.size} unused keys`, colors.green);

    // Check synchronization
    const keysMatch =
      finalEnKeys.size === finalPtKeys.size &&
      [...finalEnKeys].every((key) => finalPtKeys.has(key));

    if (keysMatch) {
      log("✨ Translation files are perfectly synchronized!", colors.green);
    } else {
      log(
        "⚠️  Warning: Translation files are not fully synchronized",
        colors.yellow,
      );
    }

    return true;
  } catch (error) {
    log("❌ Failed to clean translations", colors.red);
    log(error.message, colors.red);
    return false;
  }
}

// Main execution
if (require.main === module) {
  const success = cleanTranslations();
  process.exit(success ? 0 : 1);
}

module.exports = { cleanTranslations };
