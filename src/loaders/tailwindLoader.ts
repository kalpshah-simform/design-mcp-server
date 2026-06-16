import { loadTailwindConfig } from "../utils/configResolver.js";
import {
  tailwindThemeSchema,
  type TailwindTheme,
} from "../schemas/tailwindTheme.schema.js";

let cache: TailwindTheme | null = null;

export function loadTailwindTheme(): TailwindTheme {
  if (cache !== null) return cache;

  const config = loadTailwindConfig();

  const themeData: TailwindTheme = {
    colors: config.colors,
    spacing: config.spacing,
    breakpoints: config.breakpoints,
    borderRadius: config.borderRadius,
    boxShadow: config.boxShadow,
    ...(config.parserWarnings && config.parserWarnings.length > 0
      ? { parserWarnings: config.parserWarnings }
      : {}),
  };

  const result = tailwindThemeSchema.safeParse(themeData);
  if (!result.success) {
    throw new Error(
      `TAILWIND_INVALID: Tailwind theme schema validation failed: ${result.error.message}`,
    );
  }

  cache = result.data;
  return cache;
}

export function clearTailwindCache(): void {
  cache = null;
}
