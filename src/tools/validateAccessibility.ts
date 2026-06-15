import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";
import { loadTheme } from "../loaders/themeLoader.js";
import {
  validateA11yInputSchema,
  type ValidateA11yInput,
  type ValidateA11yOutput,
  type A11yFinding,
} from "../schemas/a11y.schema.js";

export function validateAccessibility(input: ValidateA11yInput): ValidateA11yOutput {
  validateA11yInputSchema.parse(input);

  const findings: A11yFinding[] = [];
  const registry = loadComponentRegistry();
  const componentDef = registry[input.componentName];

  if (!componentDef) {
    findings.push({
      field: "componentName",
      valid: false,
      code: "COMPONENT_NOT_FOUND",
      message: `Component '${input.componentName}' not found.`,
    });
    return { valid: false, findings };
  }

  const theme = loadTheme(input.theme ?? "default");
  const props = input.props || {};

  // Rule 1: Interactive elements must have min-height of 44px
  if (isInteractive(input.componentName)) {
    const minHeightRule = theme.a11y?.buttonMinHeight;
    const hasMinHeight = minHeightRule === "44px";

    findings.push({
      field: "a11y.buttonMinHeight",
      valid: hasMinHeight,
      code: hasMinHeight ? "A11Y_BUTTON_HEIGHT_VALID" : "A11Y_BUTTON_HEIGHT_INVALID",
      message: hasMinHeight
        ? "Button meets minimum touch target size (44px)."
        : "Button should have minimum height of 44px.",
    });
  }

  // Rule 2: Check for required ARIA attributes
  if (theme.a11y?.requiredAria) {
    const hasAriaLabel = props.ariaLabel || props["aria-label"];

    findings.push({
      field: "a11y.ariaLabel",
      valid: !!hasAriaLabel,
      code: hasAriaLabel ? "A11Y_ARIA_VALID" : "A11Y_ARIA_MISSING",
      message: hasAriaLabel
        ? "Component has ARIA label."
        : "Component should have aria-label or ariaLabel prop.",
    });
  }

  // Rule 3: Check for color contrast (simplified)
  if (props.color && props.backgroundColor) {
    const themeColors = Object.values(theme.colors || {});
    const colorValid = themeColors.includes(props.color);
    const bgValid = themeColors.includes(props.backgroundColor);

    findings.push({
      field: "a11y.colorContrast",
      valid: colorValid && bgValid,
      code: colorValid && bgValid ? "A11Y_CONTRAST_VALID" : "A11Y_CONTRAST_INVALID",
      message:
        colorValid && bgValid
          ? "Colors are from design system (contrast assumed valid)."
          : "Use colors from design system to ensure contrast compliance.",
    });
  }

  return {
    valid: findings.every((f) => f.valid),
    findings,
  };
}

function isInteractive(componentName: string): boolean {
  return ["Button", "Input", "Link", "Checkbox", "Radio"].includes(componentName);
}
