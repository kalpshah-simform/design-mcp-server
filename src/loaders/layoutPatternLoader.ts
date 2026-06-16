import { readFileSync } from "node:fs";
import path from "node:path";

import {
  layoutPatternRegistrySchema,
  type LayoutPatternRegistry,
} from "../schemas/layoutPattern.schema.js";

let cache: LayoutPatternRegistry | null = null;

export function loadLayoutPatternRegistry(): LayoutPatternRegistry {
  if (cache !== null) return cache;

  const filePath = path.join(process.cwd(), "src", "layouts", "patterns.json");

  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error("PATTERNS_NOT_FOUND: Layout patterns file was not found.");
  }

  let data: unknown;
  try {
    data = JSON.parse(fileContent);
  } catch {
    throw new Error(
      "PATTERNS_PARSE_ERROR: Layout patterns file contains invalid JSON.",
    );
  }

  const result = layoutPatternRegistrySchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `PATTERNS_INVALID: Layout patterns schema validation failed: ${result.error.message}`,
    );
  }

  cache = result.data;
  return cache;
}

export function clearLayoutPatternCache(): void {
  cache = null;
}
