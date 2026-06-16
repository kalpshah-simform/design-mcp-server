/**
 * Storybook story loader — regex / brace-counting parser.
 *
 * KNOWN LIMITATIONS (parsingMode: "regex"):
 *   1. Spread args        — `{ ...Default.args, variant: "primary" }` only captures
 *                           the inline literal keys; spread-in values are silently skipped.
 *   2. Imported args      — `args: sharedArgs` (identifier, not object literal) → no args extracted.
 *   3. Factory stories    — `export const Primary = Primary.bind({})` style → name captured,
 *                           args not extracted (no object literal present).
 *   4. CSF3 meta.args     — default-level args defined on the `meta` export are not merged
 *                           into individual story args.
 *   5. Template literals  — `` variant: `primary` `` → skipped; only quoted strings captured.
 *   6. Computed keys      — `[VARIANT_KEY]: "primary"` → skipped.
 *
 * These cases degrade gracefully: the story name is still returned, but `example`
 * may be `<ComponentName />` (no props). The `parsingWarnings` field in the
 * returned registry documents these constraints for callers.
 *
 * Upgrade path: replace `parseStoriesFile` with an AST-based implementation
 * using `@babel/parser` (plugins: ["typescript", "jsx"]) when more accurate
 * extraction is required.
 */

import path from "node:path";
import fs from "node:fs";
import { glob } from "glob";

export const PARSING_LIMITATIONS = [
  "Spread args ({ ...Base.args }) — inline keys captured, spread values skipped.",
  "Imported args (args: sharedArgs) — identifier references not resolved.",
  "Factory stories (Story.bind({})) — name captured, args not extracted.",
  "CSF3 meta.args — default-level args not merged into story args.",
  "Template literal values (`value`) — skipped; only quoted strings captured.",
  "Computed property keys ([KEY]) — skipped.",
] as const;

export interface ComponentStory {
  name: string;
  example?: string;
}

export interface ComponentStoriesRegistry {
  [componentName: string]: {
    stories: ComponentStory[];
  };
}

export interface StoriesResult {
  registry: ComponentStoriesRegistry;
  parsingMode: "regex";
  parsingWarnings: readonly string[];
}

export async function loadComponentStories(): Promise<StoriesResult> {
  const root = process.cwd();
  const storiesPattern = path.join(root, "src", "components", "**", "*.stories.tsx");

  const storyFiles = await glob(storiesPattern);
  const registry: ComponentStoriesRegistry = {};

  for (const filePath of storyFiles) {
    const componentName = extractComponentName(filePath);
    const stories = parseStoriesFile(filePath, componentName);
    if (stories.length > 0) {
      registry[componentName] = { stories };
    }
  }

  return {
    registry,
    parsingMode: "regex",
    parsingWarnings: PARSING_LIMITATIONS,
  };
}

function extractComponentName(filePath: string): string {
  const match = /components[/\\]([^/\\]+)[/\\]/.exec(filePath);
  return match ? match[1] : path.basename(filePath, ".stories.tsx");
}

function parseStoriesFile(filePath: string, componentName: string): ComponentStory[] {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  const stories: ComponentStory[] = [];
  const exportRegex = /export\s+const\s+(\w+)\s*[=:]/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const storyName = match[1];
    if (!storyName || storyName === "default" || storyName === "meta") continue;
    const args = extractStoryArgs(content, match.index);
    stories.push({ name: storyName, example: buildExample(componentName, args) });
  }

  return stories;
}

function findMatchingBrace(content: string, start: number): number {
  let count = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") count++;
    else if (content[i] === "}") {
      count--;
      if (count === 0) return i;
    }
  }
  return -1;
}

function extractStoryArgs(
  content: string,
  storyStart: number,
): Record<string, string> | undefined {
  const nextExport = content.indexOf("\nexport ", storyStart + 1);
  const searchEnd = nextExport === -1 ? content.length : nextExport;
  const segment = content.substring(storyStart, searchEnd);

  const argsIdx = segment.indexOf("args:");
  if (argsIdx === -1) return undefined;

  const braceStart = segment.indexOf("{", argsIdx);
  if (braceStart === -1) return undefined;

  const braceEnd = findMatchingBrace(segment, braceStart);
  if (braceEnd === -1) return undefined;

  const argsStr = segment.substring(braceStart, braceEnd + 1);
  const result: Record<string, string> = {};

  // Quoted string values — single or double quotes
  const strRegex = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
  let kv;
  while ((kv = strRegex.exec(argsStr)) !== null) {
    result[kv[1]] = kv[2] ?? kv[3];
  }

  // Primitive values (boolean / number) — only if key not already captured
  const primRegex = /(\w+)\s*:\s*(true|false|\d+)/g;
  while ((kv = primRegex.exec(argsStr)) !== null) {
    result[kv[1]] ??= kv[2];
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function buildExample(componentName: string, args?: Record<string, string>): string {
  if (!args || Object.keys(args).length === 0) {
    return `<${componentName} />`;
  }

  const children = args.children;
  const props = Object.entries(args)
    .filter(([k]) => k !== "children")
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");

  const propsStr = props ? ` ${props}` : "";
  return children
    ? `<${componentName}${propsStr}>${children}</${componentName}>`
    : `<${componentName}${propsStr} />`;
}
