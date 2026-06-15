import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";
import { tokenizeQuery } from "../utils/search.js";

export function searchComponents(query: string) {
  const tokens = tokenizeQuery(query);
  const registry = loadComponentRegistry();

  return Object.entries(registry)
    .map(([name, component]) => {
      const haystack = [name, component.description, ...component.tags]
        .join(" ")
        .toLowerCase();

      const score = tokens.reduce((total, token) => {
        return haystack.includes(token) ? total + 1 : total;
      }, 0);

      return {
        name,
        score,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((result) => result.name);
}
