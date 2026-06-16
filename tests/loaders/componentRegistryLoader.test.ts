import { describe, it, expect, afterEach } from "vitest";
import {
  loadComponentRegistry,
  clearComponentCache,
} from "../../src/loaders/componentRegistryLoader.js";

afterEach(() => clearComponentCache());

describe("loadComponentRegistry", () => {
  it("returns a non-empty registry", () => {
    const registry = loadComponentRegistry();
    expect(Object.keys(registry).length).toBeGreaterThan(0);
  });

  it("every component has required top-level fields", () => {
    const registry = loadComponentRegistry();
    for (const [name, component] of Object.entries(registry)) {
      expect(component, `${name} missing description`).toHaveProperty("description");
      expect(component, `${name} missing props`).toHaveProperty("props");
      expect(component, `${name} missing examples`).toHaveProperty("examples");
      expect(component, `${name} missing tags`).toHaveProperty("tags");
    }
  });

  it("props are rich PropDefinition objects with type and description", () => {
    const registry = loadComponentRegistry();
    for (const [componentName, component] of Object.entries(registry)) {
      for (const [propName, def] of Object.entries(component.props)) {
        expect(def, `${componentName}.${propName} missing type`).toHaveProperty("type");
        expect(def, `${componentName}.${propName} missing description`).toHaveProperty("description");
        expect(typeof def.description).toBe("string");
      }
    }
  });

  it("enum props have a non-empty values array", () => {
    const registry = loadComponentRegistry();
    for (const [componentName, component] of Object.entries(registry)) {
      for (const [propName, def] of Object.entries(component.props)) {
        if (def.type === "enum") {
          expect(def.values, `${componentName}.${propName} enum missing values`).toBeDefined();
          expect(def.values?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("components have an interactive flag", () => {
    const registry = loadComponentRegistry();
    const button = registry["Button"];
    const card = registry["Card"];
    expect(button.interactive).toBe(true);
    expect(card.interactive).toBe(false);
  });

  it("components have an aliases array", () => {
    const registry = loadComponentRegistry();
    for (const [name, component] of Object.entries(registry)) {
      expect(Array.isArray(component.aliases), `${name} aliases should be an array`).toBe(true);
    }
  });

  it("returns the same object reference on repeated calls (cache hit)", () => {
    const first = loadComponentRegistry();
    const second = loadComponentRegistry();
    expect(first).toBe(second);
  });

  it("returns a fresh object after cache is cleared", () => {
    const before = loadComponentRegistry();
    clearComponentCache();
    const after = loadComponentRegistry();
    expect(before).not.toBe(after);
    expect(before).toEqual(after);
  });

  it("non-deprecated components have docsUrl and storybookUrl strings", () => {
    const registry = loadComponentRegistry();
    for (const [name, component] of Object.entries(registry)) {
      if (!component.deprecated) {
        expect(typeof component.docsUrl, `${name} missing docsUrl`).toBe("string");
        expect(typeof component.storybookUrl, `${name} missing storybookUrl`).toBe("string");
      }
    }
  });
});
