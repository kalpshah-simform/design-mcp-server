import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";
import { loadTheme } from "../loaders/themeLoader.js";
import type { Theme } from "../schemas/theme.schema.js";
import {
  validateA11yInputSchema,
  type ValidateA11yInput,
  type ValidateA11yOutput,
  type A11yFinding,
} from "../schemas/a11y.schema.js";
import {
  contrastRatio,
  WCAG_AA_NORMAL,
  WCAG_AAA_NORMAL,
} from "../utils/wcag.js";

// ARIA roles that strip interactive semantics — applying them to an interactive
// component removes it from the accessibility tree as a focusable element.
const NON_INTERACTIVE_ROLES = new Set([
  "presentation",
  "none",
  "img",
  "separator",
  "group",
]);

export function validateAccessibility(input: ValidateA11yInput): ValidateA11yOutput {
  validateA11yInputSchema.parse(input);

  const registry = loadComponentRegistry();
  const componentDef = registry[input.componentName];

  if (!componentDef) {
    return {
      valid: false,
      findings: [{
        field: "componentName",
        valid: false,
        code: "COMPONENT_NOT_FOUND",
        message: `Component '${input.componentName}' not found in registry.`,
      }],
    };
  }

  const theme = loadTheme(input.theme ?? "default");
  const props = input.props ?? {};
  // Derive interactivity from the registry so no component names are hard-coded here
  const isInteractive = componentDef.interactive ?? false;
  const findings: A11yFinding[] = [];

  const heightFinding = checkButtonHeight(isInteractive, theme);
  if (heightFinding) findings.push(heightFinding);

  const ariaFinding = checkAriaLabel(props, theme);
  if (ariaFinding) findings.push(ariaFinding);

  const contrastFinding = checkColorContrast(props, theme);
  if (contrastFinding) findings.push(contrastFinding);

  const roleFinding = checkRole(isInteractive, props);
  if (roleFinding) findings.push(roleFinding);

  const keyboardFinding = checkKeyboard(isInteractive, props);
  if (keyboardFinding) findings.push(keyboardFinding);

  return { valid: findings.every((f) => f.valid), findings };
}

// ---------------------------------------------------------------------------
// Rule: minimum touch target height (interactive components only)
// ---------------------------------------------------------------------------
function checkButtonHeight(isInteractive: boolean, theme: Theme): A11yFinding | null {
  if (!isInteractive) return null;
  const valid = theme.a11y.buttonMinHeight === "44px";
  return {
    field: "a11y.buttonMinHeight",
    valid,
    code: valid ? "A11Y_BUTTON_HEIGHT_VALID" : "A11Y_BUTTON_HEIGHT_INVALID",
    message: valid
      ? `Touch target meets the 44px minimum (theme sets ${theme.a11y.buttonMinHeight}).`
      : `Touch target too small — theme sets ${theme.a11y.buttonMinHeight}, minimum is 44px.`,
  };
}

// ---------------------------------------------------------------------------
// Rule: ARIA label presence (when theme requires it)
// ---------------------------------------------------------------------------
function checkAriaLabel(props: Record<string, unknown>, theme: Theme): A11yFinding | null {
  if (!theme.a11y.requiredAria) return null;
  const valid = !!(props.ariaLabel || props["aria-label"]);
  return {
    field: "a11y.ariaLabel",
    valid,
    code: valid ? "A11Y_ARIA_VALID" : "A11Y_ARIA_MISSING",
    message: valid
      ? "Component has an ARIA label."
      : "Component should have aria-label or ariaLabel prop.",
  };
}

// ---------------------------------------------------------------------------
// Rule: WCAG contrast ratio (when both color and backgroundColor props present)
// ---------------------------------------------------------------------------
function checkColorContrast(
  props: Record<string, unknown>,
  theme: Theme,
): A11yFinding | null {
  if (!props.color || !props.backgroundColor) return null;

  const fg = props.color as string;
  const bg = props.backgroundColor as string;
  const themeColorValues = Object.values(theme.colors);

  if (!themeColorValues.includes(fg) || !themeColorValues.includes(bg)) {
    return {
      field: "a11y.colorContrast",
      valid: false,
      code: "A11Y_CONTRAST_OFF_PALETTE",
      message: "Both color and backgroundColor must be design-system palette values.",
      details: { fg, bg, fgInTheme: themeColorValues.includes(fg), bgInTheme: themeColorValues.includes(bg) },
    };
  }

  const ratio = contrastRatio(fg, bg);
  if (ratio === null) {
    return {
      field: "a11y.colorContrast",
      valid: false,
      code: "A11Y_CONTRAST_UNPARSEABLE",
      message: `Could not parse hex colors '${fg}' / '${bg}' for contrast calculation.`,
    };
  }

  const ratioFixed = Number.parseFloat(ratio.toFixed(2));
  const passesAA = ratio >= WCAG_AA_NORMAL;
  const passesAAA = ratio >= WCAG_AAA_NORMAL;

  let code: string;
  if (passesAAA) {
    code = "A11Y_CONTRAST_PASS_AAA";
  } else if (passesAA) {
    code = "A11Y_CONTRAST_PASS_AA";
  } else {
    code = "A11Y_CONTRAST_FAIL_AA";
  }

  let message: string;
  if (passesAAA) {
    message = `Contrast ${ratioFixed}:1 — passes WCAG AAA (7:1).`;
  } else if (passesAA) {
    message = `Contrast ${ratioFixed}:1 — passes WCAG AA (4.5:1) but not AAA (7:1).`;
  } else {
    message = `Contrast ${ratioFixed}:1 — fails WCAG AA. Minimum required is 4.5:1.`;
  }

  return {
    field: "a11y.colorContrast",
    valid: passesAA,
    code,
    message,
    details: { ratio: ratioFixed, wcagAA: passesAA, wcagAAA: passesAAA },
  };
}

// ---------------------------------------------------------------------------
// Rule: ARIA role must not override interactive semantics (interactive only)
// ---------------------------------------------------------------------------
function checkRole(
  isInteractive: boolean,
  props: Record<string, unknown>,
): A11yFinding | null {
  if (!isInteractive) return null;
  const role = props.role as string | undefined;
  if (!role || !NON_INTERACTIVE_ROLES.has(role)) return null;

  return {
    field: "a11y.role",
    valid: false,
    code: "A11Y_ROLE_OVERRIDES_INTERACTIVE",
    message: `role="${role}" removes this interactive element from the accessibility tree. Use an appropriate interactive role or omit role entirely.`,
    details: { role },
  };
}

// ---------------------------------------------------------------------------
// Rule: keyboard reachability — tabIndex must not be -1 (interactive only)
// ---------------------------------------------------------------------------
function checkKeyboard(
  isInteractive: boolean,
  props: Record<string, unknown>,
): A11yFinding | null {
  if (!isInteractive) return null;
  const tabIndex = props.tabIndex ?? props.tabindex;
  if (tabIndex !== -1 && tabIndex !== "-1") return null;

  return {
    field: "a11y.keyboard",
    valid: false,
    code: "A11Y_KEYBOARD_EXCLUDED",
    message:
      "tabIndex={-1} removes this element from the keyboard focus order. Only use this inside a custom focus-managed widget.",
    details: { tabIndex },
  };
}
