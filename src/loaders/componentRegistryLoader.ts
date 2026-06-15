import { readFileSync } from "node:fs";
import path from "node:path";

import {
  componentRegistrySchema,
  type ComponentRegistry,
} from "../schemas/component.schema.js";

export function loadComponentRegistry(): ComponentRegistry {
  const filePath = path.join(
    process.cwd(),
    "src",
    "registry",
    "components.json",
  );
  const fileContent = readFileSync(filePath, "utf-8");
  const data = JSON.parse(fileContent);
  return componentRegistrySchema.parse(data);
}
