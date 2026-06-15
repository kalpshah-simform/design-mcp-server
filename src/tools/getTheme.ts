import { loadTheme } from "../loaders/themeLoader.js";

export function getTheme(themeName: string) {
  return loadTheme(themeName);
}
