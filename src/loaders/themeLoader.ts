import { readFileSync } from "node:fs";
import path from "node:path";

export function loadTheme(themeName: string) {
  const filePath = path.join(process.cwd(), "themes", `${themeName}.json`);
  const fileContent = readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
}
