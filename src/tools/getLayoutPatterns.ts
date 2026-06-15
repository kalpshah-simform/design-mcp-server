import { loadLayoutPatternRegistry } from "../loaders/layoutPatternLoader.js";
import { tokenizeQuery } from "../utils/search.js";
import type { LayoutPattern } from "../schemas/layoutPattern.schema.js";

export function getLayoutPatterns(options: {
  category?: string;
  q?: string;
}): LayoutPattern[] | null {
  const registry = loadLayoutPatternRegistry();

  if (options.category) {
    const categoryId = options.category.toLowerCase();
    const pattern = Object.values(registry).find(
      (p) => p.id.toLowerCase() === categoryId,
    );
    return pattern ? [pattern] : null;
  }

  if (options.q) {
    const tokens = tokenizeQuery(options.q);

    return Object.values(registry)
      .map((pattern) => {
        const haystack = [pattern.name, pattern.description, ...pattern.tags]
          .join(" ")
          .toLowerCase();

        const score = tokens.reduce((total, token) => {
          return haystack.includes(token) ? total + 1 : total;
        }, 0);

        return {
          pattern,
          score,
        };
      })
      .filter((result) => result.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id),
      )
      .map((result) => result.pattern);
  }

  return Object.values(registry);
}
