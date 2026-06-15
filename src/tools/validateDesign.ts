import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";
import { loadTheme } from "../loaders/themeLoader.js";
import {
  validateDesignInputSchema,
  type ValidateDesignInput,
  type ValidateDesignOutput,
  type Finding,
} from "../schemas/validation.schema.js";

export function validateDesign(input: ValidateDesignInput): ValidateDesignOutput {
  validateDesignInputSchema.parse(input);
  const findings: Finding[] = [];

  const themeName = input.theme ?? "default";
  let themeData;

  try {
    themeData = loadTheme(themeName);
  } catch {
    findings.push({
      field: "theme",
      value: themeName,
      valid: false,
      code: "THEME_NOT_FOUND",
      message: `Theme '${themeName}' was not found.`,
    });
    return {
      valid: false,
      findings,
    };
  }

  const registry = loadComponentRegistry();
  const themeColors = Object.values(themeData.colors || {});

  for (let i = 0; i < input.components.length; i++) {
    const componentName = input.components[i];
    const exists = registry[componentName] !== undefined;

    findings.push({
      field: `components[${i}]`,
      value: componentName,
      valid: exists,
      code: exists ? "COMPONENT_VALID" : "UNKNOWN_COMPONENT",
      message: exists
        ? `Component '${componentName}' found.`
        : `Component '${componentName}' was not found.`,
    });
  }

  if (input.colors) {
    for (const [colorKey, colorValue] of Object.entries(input.colors)) {
      const isValidColor = themeColors.includes(colorValue);

      findings.push({
        field: `colors.${colorKey}`,
        value: colorValue,
        valid: isValidColor,
        code: isValidColor ? "COLOR_VALID" : "INVALID_COLOR_TOKEN",
        message: isValidColor
          ? `Color token '${colorValue}' is valid.`
          : `Color token '${colorValue}' was not found in theme.`,
      });
    }
  }

  return {
    valid: findings.every((f) => f.valid),
    findings,
  };
}
