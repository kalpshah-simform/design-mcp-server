import { readFileSync } from "node:fs";
import path from "node:path";

import {
  componentRegistrySchema,
  type ComponentRegistry,
} from "../schemas/component.schema.js";

let cache: ComponentRegistry | null = null;

export function loadComponentRegistry(): ComponentRegistry {
  if (cache !== null) return cache;

  const filePath = path.join(
    process.cwd(),
    "src",
    "registry",
    "components.json",
  );

  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(
      "REGISTRY_NOT_FOUND: Component registry file was not found.",
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(fileContent);
  } catch {
    throw new Error(
      "REGISTRY_PARSE_ERROR: Component registry contains invalid JSON.",
    );
  }

  const result = componentRegistrySchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `REGISTRY_INVALID: Component registry schema validation failed: ${result.error.message}`,
    );
  }

  cache = result.data;
  return cache;
}

export function clearComponentCache(): void {
  cache = null;
}
