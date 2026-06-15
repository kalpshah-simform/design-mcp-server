import path from "node:path";
import fs from "node:fs";

interface TailwindTheme {
  colors?: Record<string, string>;
  spacing?: Record<string, string>;
  breakpoints?: Record<string, string>;
  borderRadius?: Record<string, string>;
  boxShadow?: Record<string, string>;
}

export function loadTailwindConfig(): TailwindTheme {
  const root = process.cwd();
  const tsPath = path.join(root, "tailwind.config.ts");
  const jsPath = path.join(root, "tailwind.config.js");

  let configPath: string | null = null;

  if (fs.existsSync(tsPath)) {
    configPath = tsPath;
  } else if (fs.existsSync(jsPath)) {
    configPath = jsPath;
  } else {
    throw new Error(
      "tailwind.config.ts or tailwind.config.js not found in project root"
    );
  }

  const content = fs.readFileSync(configPath, "utf-8");
  return parseThemeFromConfig(content);
}

/**
 * Extract a named sub-object from a JS/TS config string using brace-counting,
 * then parse it as JSON. Never executes arbitrary code.
 */
function extractObject(content: string, key: string): Record<string, unknown> | undefined {
  const keyRegex = new RegExp(String.raw`\b${key}\s*:`);
  const keyMatch = keyRegex.exec(content);
  if (!keyMatch) return undefined;

  const braceStart = content.indexOf("{", keyMatch.index);
  if (braceStart === -1) return undefined;

  let braceCount = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") braceCount++;
    else if (content[i] === "}") {
      braceCount--;
      if (braceCount === 0) { braceEnd = i; break; }
    }
  }
  if (braceEnd === -1) return undefined;

  const objStr = content.substring(braceStart, braceEnd + 1);
  try {
    const jsonStr = objStr
      .replace(/,(\s*[}\]])/g, "$1")                       // trailing commas
      .replace(/'([^']+)'(\s*:)/g, '"$1"$2')               // single-quoted keys → double
      .replace(/:\s*'([^']*)'/g, ': "$1"')                 // single-quoted values → double
      .replace(/(['"])?([a-zA-Z_$][a-zA-Z0-9_$-]*)\1\s*:/g, (match, quote, k) => {
        if (quote) return match;
        return `"${k}":`;
      });                                                   // unquoted keys → double-quoted
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function flatStrings(obj: Record<string, unknown> | undefined): Record<string, string> | undefined {
  if (!obj) return undefined;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") result[k] = v;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function mergeExtend(
  base: Record<string, string> | undefined,
  extended: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!base && !extended) return undefined;
  return { ...base, ...extended };
}

function parseThemeFromConfig(configContent: string): TailwindTheme {
  const themeStart = configContent.indexOf("theme:");
  if (themeStart === -1) return {};

  const braceStart = configContent.indexOf("{", themeStart);
  if (braceStart === -1) return {};

  let braceCount = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < configContent.length; i++) {
    if (configContent[i] === "{") braceCount++;
    else if (configContent[i] === "}") {
      braceCount--;
      if (braceCount === 0) { braceEnd = i; break; }
    }
  }
  if (braceEnd === -1) return {};

  const themeStr = configContent.substring(braceStart, braceEnd + 1);

  // Extract the extend block once; merge its values into each base key below.
  const extendObj = extractObject(themeStr, "extend");

  // Tailwind uses 'screens' for breakpoints; accept 'breakpoints' for custom configs too.
  const screensBase =
    extractObject(themeStr, "screens") ?? extractObject(themeStr, "breakpoints");
  const screensExtend =
    (extendObj?.screens ?? extendObj?.breakpoints) as Record<string, unknown> | undefined;

  return {
    colors: mergeExtend(
      flatStrings(extractObject(themeStr, "colors")),
      flatStrings(extendObj?.colors as Record<string, unknown> | undefined),
    ),
    spacing: mergeExtend(
      flatStrings(extractObject(themeStr, "spacing")),
      flatStrings(extendObj?.spacing as Record<string, unknown> | undefined),
    ),
    breakpoints: mergeExtend(
      flatStrings(screensBase),
      flatStrings(screensExtend),
    ),
    borderRadius: mergeExtend(
      flatStrings(extractObject(themeStr, "borderRadius")),
      flatStrings(extendObj?.borderRadius as Record<string, unknown> | undefined),
    ),
    boxShadow: mergeExtend(
      flatStrings(extractObject(themeStr, "boxShadow")),
      flatStrings(extendObj?.boxShadow as Record<string, unknown> | undefined),
    ),
  };
}
