import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import type { CssVariablesResult } from "../schemas/cssVariables.schema.js";

// Ordered list of directories to scan for CSS files (relative to project root).
// Listed from most-specific to least-specific so dedicated style directories
// are preferred and deduplication stays cheap.
const SEARCH_DIRS = ["src/styles", "src/css", "styles", "src", "public", "."];

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".cache",
  "coverage",
  "__snapshots__",
  "tests",
]);

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
let cache: CssVariablesResult | null = null;

export function clearCssVariableCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load and cache all CSS custom properties found in the project.
 *
 * @param rootDir Project root; defaults to process.cwd(). Pass a custom path
 *   in tests to point at a fixture directory.
 */
export function loadCssVariables(
  rootDir: string = process.cwd(),
): CssVariablesResult {
  if (cache !== null) return cache;

  const files = findCssFiles(rootDir);

  const bySelector: Record<string, Record<string, string>> = {};
  const variables: Record<string, string> = {};
  const sources: string[] = [];

  for (const absPath of files) {
    let content: string;
    try {
      content = readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }

    const fileVars = parseCssFile(content);
    if (Object.keys(fileVars).length === 0) continue;

    const relPath = path.relative(rootDir, absPath);
    sources.push(relPath);

    for (const [selector, decls] of Object.entries(fileVars)) {
      if (!bySelector[selector]) bySelector[selector] = {};
      // Later files override earlier ones (matches CSS cascade within a build)
      Object.assign(bySelector[selector], decls);
      // Flat map: also override
      Object.assign(variables, decls);
    }
  }

  cache = { variables, bySelector, sources };
  return cache;
}

/**
 * Replace `var(--name)` references in a string with their resolved values.
 * Unresolvable references are left intact so the caller can distinguish them.
 *
 * Example:
 *   resolveVarReferences("var(--primary)", { "--primary": "#0052CC" })
 *   // → "#0052CC"
 */
export function resolveVarReferences(
  value: string,
  vars: Record<string, string>,
): string {
  return value.replace(/var\(--([a-zA-Z0-9_-]+)\)/g, (_match, name) => {
    return vars[`--${name}`] ?? `var(--${name})`;
  });
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findCssFiles(rootDir: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const dir of SEARCH_DIRS) {
    const absDir = path.join(rootDir, dir);
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".css")) continue;
      const absPath = path.join(absDir, entry.name);
      if (seen.has(absPath)) continue;
      seen.add(absPath);
      found.push(absPath);
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// CSS parser — extracts --variable: value declarations per selector block.
// Handles nested @-rules (e.g. @layer base { :root { ... } }) by recursion.
// Does NOT handle multi-line values or SCSS/Less syntax.
// ---------------------------------------------------------------------------

function extractSelectorBlocks(
  content: string,
): Array<{ selector: string; declarations: string }> {
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, ""); // strip comments
  const blocks: Array<{ selector: string; declarations: string }> = [];
  let i = 0;

  while (i < stripped.length) {
    const braceOpen = stripped.indexOf("{", i);
    if (braceOpen === -1) break;

    const selectorRaw = stripped.slice(i, braceOpen).trim();

    // Find the matching closing brace using brace counting
    let depth = 1;
    let j = braceOpen + 1;
    while (j < stripped.length && depth > 0) {
      if (stripped[j] === "{") depth++;
      else if (stripped[j] === "}") depth--;
      j++;
    }

    const innerContent = stripped.slice(braceOpen + 1, j - 1);
    i = j;

    if (selectorRaw.startsWith("@")) {
      // @-rules (media, layer, supports, etc.) wrap other rules — recurse
      const nested = extractSelectorBlocks(innerContent);
      blocks.push(...nested);
    } else if (selectorRaw.length > 0) {
      blocks.push({ selector: selectorRaw, declarations: innerContent });
    }
  }

  return blocks;
}

type ParsedSelectors = Record<string, Record<string, string>>;

function parseCssFile(content: string): ParsedSelectors {
  const blocks = extractSelectorBlocks(content);
  const result: ParsedSelectors = {};

  const DECL_RE = /--([a-zA-Z0-9_-]+)\s*:\s*([^;{}]+?)\s*;/g;

  for (const { selector, declarations } of blocks) {
    let match: RegExpExecArray | null;
    DECL_RE.lastIndex = 0;

    while ((match = DECL_RE.exec(declarations)) !== null) {
      const name = `--${match[1]}`;
      const value = match[2].trim();
      if (!result[selector]) result[selector] = {};
      result[selector][name] = value;
    }
  }

  return result;
}
