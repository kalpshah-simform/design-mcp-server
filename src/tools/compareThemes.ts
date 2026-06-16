import { loadTheme } from "../loaders/themeLoader.js";
import type { Theme } from "../schemas/theme.schema.js";

export interface TokenDiff {
  key: string;
  from: string;
  to: string;
}

export interface CategoryDiff {
  added: string[];
  removed: string[];
  changed: TokenDiff[];
  same: string[];
}

export interface ThemeComparison {
  themeA: string;
  themeB: string;
  identical: boolean;
  summary: {
    totalDifferences: number;
    categoriesWithDiffs: string[];
  };
  categories: Record<string, CategoryDiff>;
}

function flattenTheme(theme: Theme): Record<string, Record<string, string>> {
  const typographyFlat: Record<string, string> = {
    fontFamily: theme.typography.fontFamily,
    ...Object.fromEntries(
      Object.entries(theme.typography.fontSize).map(([k, v]) => [
        `fontSize.${k}`,
        v,
      ]),
    ),
  };

  return {
    colors: theme.colors,
    typography: typographyFlat,
    spacing: theme.spacing,
    radius: theme.radius,
    shadows: theme.shadows,
    a11y: {
      buttonMinHeight: theme.a11y.buttonMinHeight,
      requiredAria: String(theme.a11y.requiredAria),
    },
  };
}

function diffCategory(
  aVals: Record<string, string>,
  bVals: Record<string, string>,
): CategoryDiff {
  const allKeys = new Set([...Object.keys(aVals), ...Object.keys(bVals)]);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: TokenDiff[] = [];
  const same: string[] = [];

  for (const key of allKeys) {
    const aVal = aVals[key];
    const bVal = bVals[key];
    if (aVal === undefined) {
      added.push(key);
    } else if (bVal === undefined) {
      removed.push(key);
    } else if (aVal !== bVal) {
      changed.push({ key, from: aVal, to: bVal });
    } else {
      same.push(key);
    }
  }

  return { added, removed, changed, same };
}

export function compareThemes(
  themeAName: string,
  themeBName: string,
): ThemeComparison {
  const themeA = loadTheme(themeAName);
  const themeB = loadTheme(themeBName);

  const flatA = flattenTheme(themeA);
  const flatB = flattenTheme(themeB);

  const categories: Record<string, CategoryDiff> = {};
  for (const category of Object.keys(flatA)) {
    categories[category] = diffCategory(
      flatA[category],
      flatB[category] ?? {},
    );
  }

  const categoriesWithDiffs = Object.entries(categories)
    .filter(
      ([, diff]) =>
        diff.added.length + diff.removed.length + diff.changed.length > 0,
    )
    .map(([name]) => name);

  const totalDifferences = categoriesWithDiffs.reduce((sum, cat) => {
    const d = categories[cat];
    return sum + d.added.length + d.removed.length + d.changed.length;
  }, 0);

  return {
    themeA: themeAName,
    themeB: themeBName,
    identical: totalDifferences === 0,
    summary: { totalDifferences, categoriesWithDiffs },
    categories,
  };
}
