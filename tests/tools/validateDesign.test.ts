import { describe, it, expect, afterEach } from "vitest";
import { validateDesign } from "../../src/tools/validateDesign.js";
import { loadTheme, clearThemeCache } from "../../src/loaders/themeLoader.js";
import { clearComponentCache } from "../../src/loaders/componentRegistryLoader.js";

afterEach(() => {
  clearThemeCache();
  clearComponentCache();
});

describe("validateDesign", () => {
  it("marks a known component as valid", () => {
    const result = validateDesign({ components: ["Button"] });
    const finding = result.findings.find((f) => f.field === "components[0]");
    expect(finding?.valid).toBe(true);
    expect(finding?.code).toBe("COMPONENT_VALID");
  });

  it("marks an unknown component as invalid", () => {
    const result = validateDesign({ components: ["GhostWidget"] });
    const finding = result.findings.find((f) => f.field === "components[0]");
    expect(finding?.valid).toBe(false);
    expect(finding?.code).toBe("UNKNOWN_COMPONENT");
  });

  it("overall valid is false when any component is unknown", () => {
    const result = validateDesign({ components: ["Button", "GhostWidget"] });
    expect(result.valid).toBe(false);
  });

  it("overall valid is true when all components are known", () => {
    const result = validateDesign({ components: ["Button", "Input"] });
    expect(result.valid).toBe(true);
  });

  it("validates a color token that exists in the theme", () => {
    const theme = loadTheme("default") as { colors: Record<string, string> };
    const validColor = Object.values(theme.colors)[0];

    const result = validateDesign({
      components: ["Button"],
      colors: { primary: validColor },
    });
    const finding = result.findings.find((f) => f.field === "colors.primary");
    expect(finding?.valid).toBe(true);
    expect(finding?.code).toBe("COLOR_VALID");
  });

  it("marks an unknown color token as invalid", () => {
    const result = validateDesign({
      components: ["Button"],
      colors: { primary: "#DEADBEEF" },
    });
    const finding = result.findings.find((f) => f.field === "colors.primary");
    expect(finding?.valid).toBe(false);
    expect(finding?.code).toBe("INVALID_COLOR_TOKEN");
  });

  it("returns THEME_NOT_FOUND finding for missing theme", () => {
    const result = validateDesign({ components: ["Button"], theme: "nonexistent" });
    expect(result.valid).toBe(false);
    expect(result.findings[0].code).toBe("THEME_NOT_FOUND");
  });
});
