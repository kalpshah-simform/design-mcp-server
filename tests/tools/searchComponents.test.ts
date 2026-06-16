import { describe, it, expect, afterEach } from "vitest";
import { searchComponents } from "../../src/tools/searchComponents.js";
import { clearComponentCache } from "../../src/loaders/componentRegistryLoader.js";

afterEach(() => clearComponentCache());

describe("searchComponents — direct token matching", () => {
  it("returns Button for 'button' query", () => {
    expect(searchComponents("button")).toContain("Button");
  });

  it("returns empty array for a query that matches nothing", () => {
    expect(searchComponents("xyznotfound123abc")).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(searchComponents("button")).toEqual(searchComponents("BUTTON"));
  });

  it("handles multi-word queries", () => {
    expect(searchComponents("table data").length).toBeGreaterThan(0);
  });

  it("returns component names as strings", () => {
    for (const name of searchComponents("form")) {
      expect(typeof name).toBe("string");
    }
  });

  it("sorts results by relevance — most token matches first", () => {
    const results = searchComponents("button action");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toBe("Button");
  });
});

describe("searchComponents — synonym expansion", () => {
  it("'confirm' matches Modal via synonym → 'confirmation'", () => {
    expect(searchComponents("confirm")).toContain("Modal");
  });

  it("'dialog' matches Modal via synonym", () => {
    expect(searchComponents("dialog")).toContain("Modal");
  });

  it("'popup' matches Modal via synonym", () => {
    expect(searchComponents("popup")).toContain("Modal");
  });

  it("'grid' matches DataTable via synonym", () => {
    expect(searchComponents("grid")).toContain("DataTable");
  });

  it("'spreadsheet' matches DataTable via synonym", () => {
    expect(searchComponents("spreadsheet")).toContain("DataTable");
  });

  it("'field' matches Input via synonym", () => {
    expect(searchComponents("field")).toContain("Input");
  });

  it("'textbox' matches Input via synonym", () => {
    expect(searchComponents("textbox")).toContain("Input");
  });

  it("'container' matches Card via synonym", () => {
    expect(searchComponents("container")).toContain("Card");
  });

  it("'panel' matches Card via synonym", () => {
    expect(searchComponents("panel")).toContain("Card");
  });
});

describe("searchComponents — aliases in haystack", () => {
  it("'cta' matches Button via its aliases field", () => {
    expect(searchComponents("cta")).toContain("Button");
  });

  it("'btn' matches Button via its aliases field", () => {
    expect(searchComponents("btn")).toContain("Button");
  });

  it("'data-grid' matches DataTable via its aliases field", () => {
    expect(searchComponents("data-grid")).toContain("DataTable");
  });

  it("'overlay' matches Modal via its aliases field", () => {
    expect(searchComponents("overlay")).toContain("Modal");
  });
});
