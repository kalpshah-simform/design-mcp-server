import { readFileSync } from "node:fs";
import path from "node:path";

import { themeSchema, type Theme } from "../schemas/theme.schema.js";

const cache = new Map<string, Theme>();

export function loadTheme(themeName: string): Theme {
  const cached = cache.get(themeName);
  if (cached !== undefined) return cached;

  const filePath = path.join(process.cwd(), "themes", `${themeName}.json`);

  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`THEME_NOT_FOUND: Theme '${themeName}' was not found.`);
  }

  let data: unknown;
  try {
    data = JSON.parse(fileContent);
  } catch {
    throw new Error(`THEME_PARSE_ERROR: Theme '${themeName}' contains invalid JSON.`);
  }

  const result = themeSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `THEME_INVALID: Theme '${themeName}' failed schema validation: ${result.error.message}`,
    );
  }

  cache.set(themeName, result.data);
  return result.data;
}

export function clearThemeCache(): void {
  cache.clear();
}
