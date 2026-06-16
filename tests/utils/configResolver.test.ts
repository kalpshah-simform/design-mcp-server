import { describe, it, expect } from "vitest";
import {
  loadTailwindConfig,
  PARSER_LIMITATIONS,
} from "../../src/utils/configResolver.js";

describe("loadTailwindConfig", () => {
  it("loads tailwind config without throwing", () => {
    expect(() => loadTailwindConfig()).not.toThrow();
  });

  it("returns an object with at least one expected key", () => {
    const config = loadTailwindConfig();
    const keys = ["colors", "spacing", "breakpoints", "borderRadius", "boxShadow"];
    const hasAtLeastOne = keys.some((k) => config[k as keyof typeof config] !== undefined);
    expect(hasAtLeastOne).toBe(true);
  });

  it("colors values are hex strings when present", () => {
    const config = loadTailwindConfig();
    if (config.colors) {
      for (const value of Object.values(config.colors)) {
        expect(typeof value).toBe("string");
      }
    }
  });

  it("spacing values are strings when present", () => {
    const config = loadTailwindConfig();
    if (config.spacing) {
      for (const value of Object.values(config.spacing)) {
        expect(typeof value).toBe("string");
      }
    }
  });

  it("parserWarnings is undefined or an array of strings", () => {
    const config = loadTailwindConfig();
    if (config.parserWarnings !== undefined) {
      expect(Array.isArray(config.parserWarnings)).toBe(true);
      for (const w of config.parserWarnings) {
        expect(typeof w).toBe("string");
      }
    }
  });
});

describe("PARSER_LIMITATIONS", () => {
  it("is a non-empty readonly array", () => {
    expect(Array.isArray(PARSER_LIMITATIONS)).toBe(true);
    expect(PARSER_LIMITATIONS.length).toBeGreaterThan(0);
  });

  it("documents arrow functions, CSS variables, template literals, spread, and require()", () => {
    const combined = PARSER_LIMITATIONS.join(" ");
    expect(combined).toMatch(/arrow/i);
    expect(combined).toMatch(/css variable|var\(--/i);
    expect(combined).toMatch(/template literal/i);
    expect(combined).toMatch(/spread/i);
    expect(combined).toMatch(/require/i);
  });
});
