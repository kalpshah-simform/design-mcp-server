import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";

export function getComponentDetails(componentName: string) {
  const registry = loadComponentRegistry();
  return registry[componentName] ?? null;
}
