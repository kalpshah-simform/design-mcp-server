import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";

export interface DeprecatedComponentInfo {
  name: string;
  reason: string;
  replacement: string;
  migrationNotes: string;
}

export function getComponentDeprecated(): DeprecatedComponentInfo[] {
  const registry = loadComponentRegistry();
  const deprecated: DeprecatedComponentInfo[] = [];

  for (const [name, definition] of Object.entries(registry)) {
    if (definition.deprecated) {
      deprecated.push({
        name,
        reason: `Deprecated in version ${definition.deprecatedVersion || "unknown"}`,
        replacement: definition.replacement || "unknown",
        migrationNotes: definition.migrationNotes || "No migration notes provided.",
      });
    }
  }

  return deprecated;
}
