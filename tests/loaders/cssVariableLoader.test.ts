import path from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import {
  loadCssVariables,
  clearCssVariableCache,
  resolveVarReferences,
} from "../../src/loaders/cssVariableLoader.js";

// Point at the css fixture directory so the "." SEARCH_DIR entry finds tokens.css directly.
const FIXTURE_ROOT = path.join(
  import.meta.dirname,
  "../fixtures/css",
);

afterEach(() => clearCssVariableCache());

describe("loadCssVariables — result shape", () => {
  it("returns variables, bySelector, and sources", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    expect(result).toHaveProperty("variables");
    expect(result).toHaveProperty("bySelector");
    expect(result).toHaveProperty("sources");
  });

  it("sources lists the fixture CSS file", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.some((s) => s.endsWith(".css"))).toBe(true);
  });

  it("variables is a flat Record<string, string>", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    for (const [k, v] of Object.entries(result.variables)) {
      expect(k.startsWith("--")).toBe(true);
      expect(typeof v).toBe("string");
    }
  });

  it("bySelector groups variables under the selector they were declared in", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    const selectors = Object.keys(result.bySelector);
    expect(selectors.length).toBeGreaterThan(0);
    for (const vars of Object.values(result.bySelector)) {
      for (const k of Object.keys(vars)) {
        expect(k.startsWith("--")).toBe(true);
      }
    }
  });
});

describe("loadCssVariables — :root variables", () => {
  it("parses --color-primary from :root", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    expect(result.variables["--color-primary"]).toBeDefined();
  });

  it("parses spacing tokens from :root", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    expect(result.variables["--spacing-sm"]).toBe("8px");
    expect(result.variables["--spacing-md"]).toBe("16px");
  });

  it("parses font-family token from :root", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    expect(result.variables["--font-family-base"]).toBeDefined();
  });

  it("parses border-radius tokens from :root", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    expect(result.variables["--radius-sm"]).toBe("4px");
    expect(result.variables["--radius-md"]).toBe("8px");
  });
});

describe("loadCssVariables — selector-scoped variables", () => {
  it("captures .dark selector overrides in bySelector", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    const darkVars = result.bySelector[".dark"];
    expect(darkVars).toBeDefined();
    expect(darkVars["--color-primary"]).toBeDefined();
    expect(darkVars["--color-surface"]).toBeDefined();
  });

  it("nested @media :root block is extracted into bySelector", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    // @media strips its @-rule wrapper — inner :root block should appear
    const selectors = Object.keys(result.bySelector);
    const hasRoot = selectors.some((s) => s.includes(":root"));
    expect(hasRoot).toBe(true);
  });

  it("nested @layer :root block is extracted (handles @layer base)", () => {
    const result = loadCssVariables(FIXTURE_ROOT);
    const selectors = Object.keys(result.bySelector);
    const hasHighContrast = selectors.some((s) =>
      s.includes("high-contrast"),
    );
    expect(hasHighContrast).toBe(true);
  });
});

describe("loadCssVariables — caching", () => {
  it("returns the same object reference on repeated calls", () => {
    const first = loadCssVariables(FIXTURE_ROOT);
    const second = loadCssVariables(FIXTURE_ROOT);
    expect(first).toBe(second);
  });

  it("returns a fresh object after cache is cleared", () => {
    const before = loadCssVariables(FIXTURE_ROOT);
    clearCssVariableCache();
    const after = loadCssVariables(FIXTURE_ROOT);
    expect(before).not.toBe(after);
    expect(before).toEqual(after);
  });
});

describe("loadCssVariables — no CSS files directory", () => {
  it("returns empty result when rootDir has no CSS files", () => {
    // Point at a directory guaranteed to have no CSS files
    const result = loadCssVariables("/tmp");
    expect(result.variables).toEqual({});
    expect(result.sources).toHaveLength(0);
  });
});

describe("resolveVarReferences", () => {
  const vars = {
    "--primary": "#0052CC",
    "--spacing-md": "16px",
  };

  it("resolves a var(--x) reference", () => {
    expect(resolveVarReferences("var(--primary)", vars)).toBe("#0052CC");
  });

  it("resolves multiple var() references in one string", () => {
    expect(
      resolveVarReferences("var(--primary) var(--spacing-md)", vars),
    ).toBe("#0052CC 16px");
  });

  it("leaves unresolvable var() intact", () => {
    expect(resolveVarReferences("var(--missing)", vars)).toBe("var(--missing)");
  });

  it("passes non-var strings through unchanged", () => {
    expect(resolveVarReferences("#0052CC", vars)).toBe("#0052CC");
    expect(resolveVarReferences("16px", vars)).toBe("16px");
  });

  it("resolves only the known var in a mixed string", () => {
    const result = resolveVarReferences("var(--primary) var(--unknown)", vars);
    expect(result).toBe("#0052CC var(--unknown)");
  });
});
