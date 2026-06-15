import { loadTailwindConfig } from "../utils/configResolver.js";
import {
  tailwindThemeSchema,
  type TailwindTheme,
} from "../schemas/tailwindTheme.schema.js";

export function loadTailwindTheme(): TailwindTheme {
  const config = loadTailwindConfig();

  // The parser returns the theme object directly from the theme: {...} property
  const themeData: TailwindTheme = {
    colors: config.colors,
    spacing: config.spacing,
    breakpoints: config.breakpoints,
    borderRadius: config.borderRadius,
    boxShadow: config.boxShadow,
  };

  return tailwindThemeSchema.parse(themeData);
}
