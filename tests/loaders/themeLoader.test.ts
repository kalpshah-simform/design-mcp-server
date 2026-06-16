import { describe, it, expect, afterEach } from "vitest";
import { loadTheme, clearThemeCache } from "../../src/loaders/themeLoader.js";

afterEach(() => clearThemeCache());

describe("loadTheme", () => {
  it("loads the default theme with all required top-level keys", () => {
    const theme = loadTheme("default");
    expect(theme).toHaveProperty("colors");
    expect(theme).toHaveProperty("typography");
    expect(theme).toHaveProperty("spacing");
    expect(theme).toHaveProperty("radius");
    expect(theme).toHaveProperty("shadows");
    expect(theme).toHaveProperty("a11y");
  });

  it("a11y block has buttonMinHeight and requiredAria", () => {
    const theme = loadTheme("default");
    expect(theme.a11y).toHaveProperty("buttonMinHeight");
    expect(theme.a11y).toHaveProperty("requiredAria");
    expect(typeof theme.a11y.buttonMinHeight).toBe("string");
    expect(typeof theme.a11y.requiredAria).toBe("boolean");
  });

  it("loads customer-a and customer-b without throwing", () => {
    expect(() => loadTheme("customer-a")).not.toThrow();
    expect(() => loadTheme("customer-b")).not.toThrow();
  });

  it("throws THEME_NOT_FOUND for a missing theme", () => {
    expect(() => loadTheme("nonexistent-theme")).toThrow("THEME_NOT_FOUND");
  });

  it("returns the same object reference on repeated calls (cache hit)", () => {
    const first = loadTheme("default");
    const second = loadTheme("default");
    expect(first).toBe(second);
  });

  it("returns a fresh object after cache is cleared", () => {
    const before = loadTheme("default");
    clearThemeCache();
    const after = loadTheme("default");
    expect(before).not.toBe(after);
    expect(before).toEqual(after);
  });
});

describe("startup theme validation (all built-in themes pass schema)", () => {
  it.each(["default", "customer-a", "customer-b"])(
    "theme '%s' passes Zod schema validation",
    (themeName) => {
      expect(() => loadTheme(themeName)).not.toThrow();
      const theme = loadTheme(themeName);
      expect(theme.colors).toBeTruthy();
      expect(theme.a11y.buttonMinHeight).toBe("44px");
    },
  );
});
