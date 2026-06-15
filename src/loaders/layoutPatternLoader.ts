import { readFileSync } from "node:fs";
import path from "node:path";

import {
  layoutPatternRegistrySchema,
  type LayoutPatternRegistry,
} from "../schemas/layoutPattern.schema.js";

export function loadLayoutPatternRegistry(): LayoutPatternRegistry {
  const filePath = path.join(process.cwd(), "src", "layouts", "patterns.json");
  const fileContent = readFileSync(filePath, "utf-8");
  const data = JSON.parse(fileContent);
  return layoutPatternRegistrySchema.parse(data);
}
