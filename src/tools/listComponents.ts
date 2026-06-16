import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";

export interface ComponentSummary {
  name: string;
  deprecated: boolean;
  replacement?: string;
}

export function listComponents(): ComponentSummary[] {
  const registry = loadComponentRegistry();
  return Object.entries(registry).map(([name, def]) => {
    const summary: ComponentSummary = { name, deprecated: def.deprecated ?? false };
    if (def.deprecated && def.replacement) {
      summary.replacement = def.replacement;
    }
    return summary;
  });
}
