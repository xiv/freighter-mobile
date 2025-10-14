import { AppVersionDifference } from "config/constants";

/**
 * Version comparison utilities for app update checking
 */

/**
 * Compares two semantic version strings
 * @param version1 - First version to compare (e.g., "1.2.3")
 * @param version2 - Second version to compare (e.g., "1.2.4")
 * @returns AppVersionDifference.LOWER if version1 < version2, SAME if equal, GREATER if version1 > version2
 */
export const compareVersions = (
  version1: string,
  version2: string,
): AppVersionDifference => {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  // Ensure both arrays have the same length by padding with zeros
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] < v2Parts[i]) return AppVersionDifference.LOWER;
    if (v1Parts[i] > v2Parts[i]) return AppVersionDifference.GREATER;
  }

  return AppVersionDifference.SAME;
};

/**
 * Checks if the current app version is below the required version
 * @param currentVersion - Current app version
 * @param requiredVersion - Required minimum version
 * @returns true if current version is below required version
 */
export const isVersionBelowRequired = (
  currentVersion: string,
  requiredVersion: string,
): boolean =>
  compareVersions(currentVersion, requiredVersion) ===
  AppVersionDifference.LOWER;

/**
 * Checks if the current app version is below the latest version
 * @param currentVersion - Current app version
 * @param latestVersion - Latest available version
 * @returns true if current version is below latest version
 */
export const isVersionBelowLatest = (
  currentVersion: string,
  latestVersion: string,
): boolean =>
  compareVersions(currentVersion, latestVersion) === AppVersionDifference.LOWER;

/**
 * Calculates the version difference between two versions
 * @param currentVersion - Current app version
 * @param targetVersion - Target version to compare against
 * @returns Object with major, minor, and patch differences
 */
export const getVersionDifference = (
  currentVersion: string,
  targetVersion: string,
) => {
  const current = currentVersion.split(".").map(Number);
  const target = targetVersion.split(".").map(Number);

  // Ensure both arrays have the same length by padding with zeros
  const maxLength = Math.max(current.length, target.length);
  while (current.length < maxLength) current.push(0);
  while (target.length < maxLength) target.push(0);

  return {
    major: target[0] - current[0],
    minor: target[1] - current[1],
    patch: target[2] - current[2],
  };
};

/**
 * Checks if the version difference is significant (more than 0.2.0)
 * @param currentVersion - Current app version
 * @param targetVersion - Target version to compare against
 * @returns true if the difference is significant
 */
export const isSignificantVersionDifference = (
  currentVersion: string,
  targetVersion: string,
): boolean => {
  const diff = getVersionDifference(currentVersion, targetVersion);

  // Check if major version difference is > 0 OR minor version difference is >= 2
  return diff.major > 0 || diff.minor >= 2;
};
