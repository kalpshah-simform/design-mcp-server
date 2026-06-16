import { describe, it, expect, afterEach } from "vitest";
import { compareThemes } from "../../src/tools/compareThemes.js";
import { clearThemeCache } from "../../src/loaders/themeLoader.js";

afterEach(() => clearThemeCache());

describe("compareThemes — structure", () => {
  it("returns the correct themeA and themeB names", () => {
    const result = compareThemes("default", "customer-a");
    expect(result.themeA).toBe("default");
    expect(result.themeB).toBe("customer-a");
  });

  it("has the expected top-level shape", () => {
    const result = compareThemes("default", "customer-a");
    expect(result).toHaveProperty("identical");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("categories");
    expect(result.summary).toHaveProperty("totalDifferences");
    expect(result.summary).toHaveProperty("categoriesWithDiffs");
  });

  it("categories include colors, typography, spacing, radius, shadows, a11y", () => {
    const result = compareThemes("default", "customer-a");
    const keys = Object.keys(result.categories);
    expect(keys).toContain("colors");
    expect(keys).toContain("typography");
    expect(keys).toContain("spacing");
    expect(keys).toContain("radius");
    expect(keys).toContain("shadows");
    expect(keys).toContain("a11y");
  });

  it("each category diff has added, removed, changed, same arrays", () => {
    const result = compareThemes("default", "customer-a");
    for (const diff of Object.values(result.categories)) {
      expect(Array.isArray(diff.added)).toBe(true);
      expect(Array.isArray(diff.removed)).toBe(true);
      expect(Array.isArray(diff.changed)).toBe(true);
      expect(Array.isArray(diff.same)).toBe(true);
    }
  });
});

describe("compareThemes — identical themes", () => {
  it("reports identical=true and 0 differences when comparing a theme to itself", () => {
    const result = compareThemes("default", "default");
    expect(result.identical).toBe(true);
    expect(result.summary.totalDifferences).toBe(0);
    expect(result.summary.categoriesWithDiffs).toHaveLength(0);
  });

  it("all token keys land in same[] when identical", () => {
    const result = compareThemes("default", "default");
    for (const diff of Object.values(result.categories)) {
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.changed).toHaveLength(0);
      expect(diff.same.length).toBeGreaterThan(0);
    }
  });
});

describe("compareThemes — different themes", () => {
  it("reports identical=false for default vs customer-a", () => {
    const result = compareThemes("default", "customer-a");
    expect(result.identical).toBe(false);
  });

  it("totalDifferences matches the sum of added+removed+changed across categories", () => {
    const result = compareThemes("default", "customer-a");
    let sum = 0;
    for (const diff of Object.values(result.categories)) {
      sum += diff.added.length + diff.removed.length + diff.changed.length;
    }
    expect(result.summary.totalDifferences).toBe(sum);
  });

  it("categoriesWithDiffs only lists categories that actually have differences", () => {
    const result = compareThemes("default", "customer-a");
    for (const cat of result.summary.categoriesWithDiffs) {
      const diff = result.categories[cat];
      const hasDiff =
        diff.added.length + diff.removed.length + diff.changed.length > 0;
      expect(hasDiff).toBe(true);
    }
  });

  it("changed token diffs have key, from, and to fields", () => {
    const result = compareThemes("default", "customer-a");
    for (const diff of Object.values(result.categories)) {
      for (const change of diff.changed) {
        expect(typeof change.key).toBe("string");
        expect(typeof change.from).toBe("string");
        expect(typeof change.to).toBe("string");
        expect(change.from).not.toBe(change.to);
      }
    }
  });

  it("colors category has changed tokens between default and customer-a", () => {
    const result = compareThemes("default", "customer-a");
    expect(result.categories.colors.changed.length).toBeGreaterThan(0);
  });
});

describe("compareThemes — error handling", () => {
  it("throws for an unknown theme name", () => {
    expect(() => compareThemes("default", "nonexistent-theme")).toThrow();
  });

  it("throws when both theme names are unknown", () => {
    expect(() => compareThemes("ghost", "phantom")).toThrow();
  });
});
