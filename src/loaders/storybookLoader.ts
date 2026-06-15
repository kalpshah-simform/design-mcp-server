import path from "node:path";
import fs from "node:fs";
import { glob } from "glob";

export interface ComponentStory {
  name: string;
  example?: string;
}

export interface ComponentStoriesRegistry {
  [componentName: string]: {
    stories: ComponentStory[];
  };
}

export async function loadComponentStories(): Promise<ComponentStoriesRegistry> {
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

  return registry;
}

function extractComponentName(filePath: string): string {
  const match = /components[/\\]([^/\\]+)[/\\]/.exec(filePath);
  return match ? match[1] : path.basename(filePath, ".stories.tsx");
}

function parseStoriesFile(filePath: string, componentName: string): ComponentStory[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const stories: ComponentStory[] = [];

  const exportRegex = /export\s+const\s+(\w+)\s*[=:]/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const storyName = match[1];
    if (!storyName || storyName === "default" || storyName === "meta") continue;

    const args = extractStoryArgs(content, match.index);
    stories.push({
      name: storyName,
      example: buildExample(componentName, args),
    });
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

function extractStoryArgs(content: string, storyStart: number): Record<string, string> | undefined {
  // Look for args: only within this story's block (before the next export)
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

  // Extract string values (single or double quoted)
  const strRegex = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
  let kv;
  while ((kv = strRegex.exec(argsStr)) !== null) {
    result[kv[1]] = kv[2] ?? kv[3];
  }

  // Extract primitive values (boolean or number) — only if key not already captured
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

  if (children) {
    return `<${componentName}${propsStr}>${children}</${componentName}>`;
  }
  return `<${componentName}${propsStr} />`;
}
