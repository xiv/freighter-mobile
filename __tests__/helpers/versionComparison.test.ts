import { Comparison } from "config/constants";
import {
  compareVersions,
  isVersionBelowRequired,
  isVersionBelowLatest,
  getVersionDifference,
} from "helpers/versionComparison";

describe("versionComparison helpers", () => {
  describe("compareVersions", () => {
    it("should return SAME for identical versions", () => {
      expect(compareVersions("1.0.0", "1.0.0")).toBe(Comparison.SAME);
      expect(compareVersions("2.5.3", "2.5.3")).toBe(Comparison.SAME);
      expect(compareVersions("0.0.1", "0.0.1")).toBe(Comparison.SAME);
    });

    it("should return LOWER when first version is lower", () => {
      expect(compareVersions("1.0.0", "1.0.1")).toBe(Comparison.LOWER);
      expect(compareVersions("1.0.0", "1.1.0")).toBe(Comparison.LOWER);
      expect(compareVersions("1.0.0", "2.0.0")).toBe(Comparison.LOWER);
      expect(compareVersions("0.9.9", "1.0.0")).toBe(Comparison.LOWER);
    });

    it("should return GREATER when first version is higher", () => {
      expect(compareVersions("1.0.1", "1.0.0")).toBe(Comparison.GREATER);
      expect(compareVersions("1.1.0", "1.0.0")).toBe(Comparison.GREATER);
      expect(compareVersions("2.0.0", "1.0.0")).toBe(Comparison.GREATER);
      expect(compareVersions("1.0.0", "0.9.9")).toBe(Comparison.GREATER);
    });

    it("should handle different length versions by padding with zeros", () => {
      expect(compareVersions("1.0", "1.0.0")).toBe(Comparison.SAME);
      expect(compareVersions("1.0.0", "1.0")).toBe(Comparison.SAME);
      expect(compareVersions("1.0", "1.0.1")).toBe(Comparison.LOWER);
      expect(compareVersions("1.0.1", "1.0")).toBe(Comparison.GREATER);
      expect(compareVersions("1", "1.0.0")).toBe(Comparison.SAME);
      expect(compareVersions("1.0.0", "1")).toBe(Comparison.SAME);
    });

    it("should handle complex version comparisons", () => {
      expect(compareVersions("1.2.3", "1.2.4")).toBe(Comparison.LOWER);
      expect(compareVersions("1.2.4", "1.2.3")).toBe(Comparison.GREATER);
      expect(compareVersions("2.0.0", "1.9.9")).toBe(Comparison.GREATER);
      expect(compareVersions("1.9.9", "2.0.0")).toBe(Comparison.LOWER);
    });

    it("should handle edge cases", () => {
      expect(compareVersions("0.0.0", "0.0.1")).toBe(Comparison.LOWER);
      expect(compareVersions("0.0.1", "0.0.0")).toBe(Comparison.GREATER);
      expect(compareVersions("", "1.0.0")).toBe(Comparison.LOWER);
      expect(compareVersions("1.0.0", "")).toBe(Comparison.GREATER);
    });
  });

  describe("isVersionBelowRequired", () => {
    it("should return true when current version is below required", () => {
      expect(isVersionBelowRequired("1.0.0", "1.0.1")).toBe(true);
      expect(isVersionBelowRequired("1.0.0", "1.1.0")).toBe(true);
      expect(isVersionBelowRequired("1.0.0", "2.0.0")).toBe(true);
      expect(isVersionBelowRequired("0.9.9", "1.0.0")).toBe(true);
    });

    it("should return false when current version meets or exceeds required", () => {
      expect(isVersionBelowRequired("1.0.0", "1.0.0")).toBe(false);
      expect(isVersionBelowRequired("1.0.1", "1.0.0")).toBe(false);
      expect(isVersionBelowRequired("1.1.0", "1.0.0")).toBe(false);
      expect(isVersionBelowRequired("2.0.0", "1.0.0")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isVersionBelowRequired("0.0.0", "0.0.1")).toBe(true);
      expect(isVersionBelowRequired("0.0.1", "0.0.0")).toBe(false);
    });
  });

  describe("isVersionBelowLatest", () => {
    it("should return true when current version is below latest", () => {
      expect(isVersionBelowLatest("1.0.0", "1.0.1")).toBe(true);
      expect(isVersionBelowLatest("1.0.0", "1.1.0")).toBe(true);
      expect(isVersionBelowLatest("1.0.0", "2.0.0")).toBe(true);
    });

    it("should return false when current version is at or above latest", () => {
      expect(isVersionBelowLatest("1.0.0", "1.0.0")).toBe(false);
      expect(isVersionBelowLatest("1.0.1", "1.0.0")).toBe(false);
      expect(isVersionBelowLatest("1.1.0", "1.0.0")).toBe(false);
    });
  });

  describe("getVersionDifference", () => {
    it("should calculate correct differences for major versions", () => {
      const diff = getVersionDifference("1.0.0", "2.0.0");
      expect(diff.major).toBe(1);
      expect(diff.minor).toBe(0);
      expect(diff.protocol).toBe(0);
    });

    it("should calculate correct differences for minor versions", () => {
      const diff = getVersionDifference("1.0.0", "1.2.0");
      expect(diff.major).toBe(0);
      expect(diff.minor).toBe(2);
      expect(diff.protocol).toBe(0);
    });

    it("should calculate correct differences for protocol versions", () => {
      const diff = getVersionDifference("1.0.0", "1.0.3");
      expect(diff.major).toBe(0);
      expect(diff.minor).toBe(0);
      expect(diff.protocol).toBe(3);
    });

    it("should calculate correct differences for mixed changes", () => {
      const diff = getVersionDifference("1.2.3", "2.1.4");
      expect(diff.major).toBe(1);
      expect(diff.minor).toBe(-1);
      expect(diff.protocol).toBe(1);
    });

    it("should handle different length versions", () => {
      const diff1 = getVersionDifference("1.0", "1.0.3");
      expect(diff1.major).toBe(0);
      expect(diff1.minor).toBe(0);
      expect(diff1.protocol).toBe(3);

      const diff2 = getVersionDifference("1.0.3", "1.0");
      expect(diff2.major).toBe(0);
      expect(diff2.minor).toBe(0);
      expect(diff2.protocol).toBe(-3);
    });

    it("should handle identical versions", () => {
      const diff = getVersionDifference("1.2.3", "1.2.3");
      expect(diff.major).toBe(0);
      expect(diff.minor).toBe(0);
      expect(diff.protocol).toBe(0);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle typical app version scenarios", () => {
      // Current app version scenarios
      expect(isVersionBelowRequired("0.1.0", "0.2.0")).toBe(true);
      expect(isVersionBelowRequired("0.2.0", "0.2.0")).toBe(false);
      expect(isVersionBelowRequired("0.3.0", "0.2.0")).toBe(false);
    });
  });
});
