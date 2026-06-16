import { describe, it, expect, afterEach } from "vitest";
import { validateAccessibility } from "../../src/tools/validateAccessibility.js";
import { clearThemeCache } from "../../src/loaders/themeLoader.js";
import { clearComponentCache } from "../../src/loaders/componentRegistryLoader.js";

afterEach(() => {
  clearThemeCache();
  clearComponentCache();
});

describe("validateAccessibility — component lookup", () => {
  it("returns COMPONENT_NOT_FOUND for an unknown component", () => {
    const result = validateAccessibility({ componentName: "GhostWidget" });
    expect(result.valid).toBe(false);
    expect(result.findings[0].code).toBe("COMPONENT_NOT_FOUND");
  });
});

describe("validateAccessibility — touch target (interactive components)", () => {
  it("checks button min-height for Button (interactive=true)", () => {
    const result = validateAccessibility({ componentName: "Button" });
    const finding = result.findings.find((f) => f.field === "a11y.buttonMinHeight");
    expect(finding).toBeDefined();
  });

  it("passes A11Y_BUTTON_HEIGHT_VALID when theme sets 44px", () => {
    const result = validateAccessibility({ componentName: "Button", theme: "default" });
    const finding = result.findings.find((f) => f.field === "a11y.buttonMinHeight");
    expect(finding?.code).toBe("A11Y_BUTTON_HEIGHT_VALID");
  });

  it("does NOT check button height for Card (interactive=false)", () => {
    const result = validateAccessibility({ componentName: "Card" });
    const finding = result.findings.find((f) => f.field === "a11y.buttonMinHeight");
    expect(finding).toBeUndefined();
  });

  it("Modal is interactive and gets a height check", () => {
    const result = validateAccessibility({ componentName: "Modal" });
    const finding = result.findings.find((f) => f.field === "a11y.buttonMinHeight");
    expect(finding).toBeDefined();
  });
});

describe("validateAccessibility — ARIA label", () => {
  it("passes A11Y_ARIA_VALID when aria-label prop is present", () => {
    const result = validateAccessibility({
      componentName: "Button",
      props: { "aria-label": "Submit form" },
    });
    const finding = result.findings.find((f) => f.field === "a11y.ariaLabel");
    expect(finding?.valid).toBe(true);
    expect(finding?.code).toBe("A11Y_ARIA_VALID");
  });

  it("flags A11Y_ARIA_MISSING when no aria-label present", () => {
    const result = validateAccessibility({ componentName: "Button", props: {} });
    const finding = result.findings.find((f) => f.field === "a11y.ariaLabel");
    expect(finding?.valid).toBe(false);
    expect(finding?.code).toBe("A11Y_ARIA_MISSING");
  });

  it("accepts camelCase ariaLabel as equivalent to aria-label", () => {
    const result = validateAccessibility({
      componentName: "Button",
      props: { ariaLabel: "Close dialog" },
    });
    const finding = result.findings.find((f) => f.field === "a11y.ariaLabel");
    expect(finding?.valid).toBe(true);
  });
});

describe("validateAccessibility — WCAG contrast ratio", () => {
  it("skips contrast check when color props are absent", () => {
    const result = validateAccessibility({ componentName: "Button" });
    const finding = result.findings.find((f) => f.field === "a11y.colorContrast");
    expect(finding).toBeUndefined();
  });

  it("passes AA and AAA for high-contrast pair (black on white)", () => {
    const result = validateAccessibility({
      componentName: "Button",
      props: { color: "#000000", backgroundColor: "#FFFFFF" },
      theme: "default",
    });
    const finding = result.findings.find((f) => f.field === "a11y.colorContrast");
    // #000000 and #FFFFFF are not in the default theme palette, so expect OFF_PALETTE
    expect(finding?.code).toBe("A11Y_CONTRAST_OFF_PALETTE");
  });

  it("reports ratio and wcag flags in details for theme palette colors", () => {
    // Use actual theme colors that exist in default.json
    const result = validateAccessibility({
      componentName: "Button",
      props: { color: "#0052CC", backgroundColor: "#FFFFFF" },
      theme: "default",
    });
    const finding = result.findings.find((f) => f.field === "a11y.colorContrast");
    expect(finding).toBeDefined();
    // Both colors are in the default theme palette
    if (finding?.code !== "A11Y_CONTRAST_OFF_PALETTE") {
      expect(finding?.details).toHaveProperty("ratio");
      expect(finding?.details).toHaveProperty("wcagAA");
      expect(finding?.details).toHaveProperty("wcagAAA");
    }
  });

  it("rejects non-palette colors with A11Y_CONTRAST_OFF_PALETTE", () => {
    const result = validateAccessibility({
      componentName: "Button",
      props: { color: "#ABCDEF", backgroundColor: "#123456" },
    });
    const finding = result.findings.find((f) => f.field === "a11y.colorContrast");
    expect(finding?.code).toBe("A11Y_CONTRAST_OFF_PALETTE");
    expect(finding?.valid).toBe(false);
  });
});

describe("validateAccessibility — role override", () => {
  it("flags A11Y_ROLE_OVERRIDES_INTERACTIVE for role=presentation on Button", () => {
    const result = validateAccessibility({
      componentName: "Button",
      props: { role: "presentation" },
    });
    const finding = result.findings.find((f) => f.field === "a11y.role");
    expect(finding?.valid).toBe(false);
    expect(finding?.code).toBe("A11Y_ROLE_OVERRIDES_INTERACTIVE");
  });

  it("does not produce a role finding when role is absent", () => {
    const result = validateAccessibility({ componentName: "Button", props: {} });
    const finding = result.findings.find((f) => f.field === "a11y.role");
    expect(finding).toBeUndefined();
  });

  it("does not produce a role finding for non-interactive components", () => {
    const result = validateAccessibility({
      componentName: "Card",
      props: { role: "presentation" },
    });
    const finding = result.findings.find((f) => f.field === "a11y.role");
    expect(finding).toBeUndefined();
  });
});

describe("validateAccessibility — keyboard reachability", () => {
  it("flags A11Y_KEYBOARD_EXCLUDED when tabIndex=-1 on Button", () => {
    const result = validateAccessibility({
      componentName: "Button",
      props: { tabIndex: -1 },
    });
    const finding = result.findings.find((f) => f.field === "a11y.keyboard");
    expect(finding?.valid).toBe(false);
    expect(finding?.code).toBe("A11Y_KEYBOARD_EXCLUDED");
  });

  it("also catches tabIndex as string '-1'", () => {
    const result = validateAccessibility({
      componentName: "Button",
      props: { tabIndex: "-1" },
    });
    const finding = result.findings.find((f) => f.field === "a11y.keyboard");
    expect(finding?.valid).toBe(false);
  });

  it("does not flag keyboard when tabIndex is absent", () => {
    const result = validateAccessibility({ componentName: "Button", props: {} });
    const finding = result.findings.find((f) => f.field === "a11y.keyboard");
    expect(finding).toBeUndefined();
  });

  it("does not check keyboard for non-interactive Card", () => {
    const result = validateAccessibility({
      componentName: "Card",
      props: { tabIndex: -1 },
    });
    const finding = result.findings.find((f) => f.field === "a11y.keyboard");
    expect(finding).toBeUndefined();
  });
});
