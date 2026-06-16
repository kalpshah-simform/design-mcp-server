import { describe, it, expect, afterEach } from "vitest";
import { listComponents } from "../../src/tools/listComponents.js";
import { clearComponentCache } from "../../src/loaders/componentRegistryLoader.js";

afterEach(() => clearComponentCache());

describe("listComponents", () => {
  it("returns an array of component summary objects", () => {
    const components = listComponents();
    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThan(0);
  });

  it("each entry has a name (string) and deprecated (boolean)", () => {
    const components = listComponents();
    for (const c of components) {
      expect(typeof c.name).toBe("string");
      expect(typeof c.deprecated).toBe("boolean");
    }
  });

  it("deprecated components include a replacement field", () => {
    const components = listComponents();
    const deprecated = components.filter((c) => c.deprecated);
    expect(deprecated.length).toBeGreaterThan(0);
    for (const c of deprecated) {
      expect(c.replacement).toBeDefined();
      expect(typeof c.replacement).toBe("string");
    }
  });

  it("active components do not have a replacement field", () => {
    const components = listComponents();
    const active = components.filter((c) => !c.deprecated);
    for (const c of active) {
      expect(c.replacement).toBeUndefined();
    }
  });

  it("Button is present and not deprecated", () => {
    const components = listComponents();
    const button = components.find((c) => c.name === "Button");
    expect(button).toBeDefined();
    expect(button?.deprecated).toBe(false);
  });

  it("ButtonLegacy is present and deprecated with a replacement", () => {
    const components = listComponents();
    const legacy = components.find((c) => c.name === "ButtonLegacy");
    expect(legacy).toBeDefined();
    expect(legacy?.deprecated).toBe(true);
    expect(legacy?.replacement).toBe("Button");
  });
});
