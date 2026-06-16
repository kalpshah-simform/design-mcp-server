import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";
import { tokenizeQuery } from "../utils/search.js";
import { expandQueryTokens } from "../utils/synonyms.js";

export function searchComponents(query: string) {
  const tokens = expandQueryTokens(tokenizeQuery(query));
  const registry = loadComponentRegistry();

  return Object.entries(registry)
    .map(([name, component]) => {
      const haystackParts = [
        name,
        component.description,
        ...component.tags,
        ...(component.aliases ?? []),
      ];
      const haystack = haystackParts.join(" ").toLowerCase();

      const score = tokens.reduce((total, token) => {
        return haystack.includes(token) ? total + 1 : total;
      }, 0);

      return { name, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((result) => result.name);
}
