import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";

export function listComponents() {
  const registry = loadComponentRegistry();
  return Object.keys(registry);
}
