# Phase 3 Plan: Tailwind Integration, Storybook Parsing, and Deprecated Detection

## 1) Current Implementation Review

### Completed (Phase 1 & 2)
- **Phase 1 (MVP)**: 4 core tools — `get-theme`, `list-components`, `get-component-details`, `search-components`
  - Manual JSON-based theme files (`themes/default.json`, `themes/customer-a.json`, `themes/customer-b.json`)
  - Static component registry (`src/registry/components.json`)
  - Token-based semantic search for components

- **Phase 2 (Extended)**: 2 new tools — `get-layout-patterns`, `validate-design`
  - Layout pattern templates (`src/layouts/patterns.json`)
  - Design validation engine (component & color token checking)
  - Full-page scaffolding support

- **Infrastructure**:
  - Fastify HTTP server with MCP SDK integration
  - Dual transport: MCP (`POST /` and `POST /mcp`) + REST mirrors (`GET/POST /tools/*`)
  - Zod schema validation for all data types
  - NodeNext ESM module resolution

### Not Implemented Yet (Phase 3 scope)
- **Tailwind config loader** — no tool to expose Tailwind theme values to AI
- **Storybook parser** — no integration with `.stories.tsx` files for auto-extracting component metadata
- **Deprecated component detection** — no tool to flag outdated components and suggest replacements
- **Accessibility audit tool** — no tool to validate WCAG contrast, focus states, keyboard navigation
- `src/loaders/tailwindLoader.ts` — does not exist
- `src/loaders/storybookLoader.ts` — does not exist
- `src/schemas/tailwindTheme.schema.ts` — does not exist
- `src/tools/getTailwindTheme.ts` — does not exist
- `src/tools/validateAccessibility.ts` — does not exist
- Component deprecation metadata in `components.json` — no `deprecated`, `replacement`, `deprecatedVersion` fields

## 2) Phase 3 Goal

Extend the MCP server with tools that automatically learn from your development artifacts and provide enhanced validation:

- **`get-tailwind-theme`** — AI can read actual Tailwind config values (colors, spacing, breakpoints) instead of just manual theme tokens. Enables Tailwind class validation against your real config.

- **`list-component-stories`** — AI discovers component examples from Storybook stories. Extracts real usage patterns, props, and variants from `.stories.tsx` files.

- **`get-component-deprecated`** — AI learns which components are deprecated, why, and what to use instead. Prevents AI from suggesting outdated components.

- **`validate-accessibility`** — AI submits component props and receives accessibility validation (WCAG compliance, contrast ratios, focus states). AI can iteratively fix a11y issues.

**Vision**: The MCP server becomes a live, auto-updating interface to your design system. Changes in Tailwind config, Storybook stories, or component deprecations are immediately reflected in AI code generation without manual updates.

## 3) Scope (Phase 3 Only)

### In scope

**Task A: Tailwind Config Parsing**
- `src/loaders/tailwindLoader.ts` — reads and parses `tailwind.config.js` or `tailwind.config.ts`
- `src/schemas/tailwindTheme.schema.ts` — Zod schema for Tailwind theme structure
- `src/tools/getTailwindTheme.ts` — returns `{ colors, spacing, breakpoints, borderRadius, boxShadow }`

**Task B: Storybook Integration**
- `src/loaders/storybookLoader.ts` — discovers and parses `.stories.tsx` files in a configurable directory
- Extracts: component name, props (from args), examples (story names), variants
- `src/tools/listComponentStories.ts` — returns stories grouped by component name
- Data structure: `{ [componentName]: { stories: [{ name, args, example }] } }`

**Task C: Component Deprecation Metadata**
- Extend `src/registry/components.json` with optional fields:
  - `deprecated` (boolean): whether component is obsolete
  - `deprecatedVersion` (string): version when it was deprecated
  - `replacement` (string): recommended alternative component name
  - `migrationNotes` (string): guidance on how to migrate
- `src/tools/getComponentDeprecated.ts` — returns deprecated components and their replacements

**Task D: Accessibility Validation**
- `src/schemas/a11y.schema.ts` — Zod schema for a11y validation rules
- `src/tools/validateAccessibility.ts` — accepts component name + props, returns `{ valid, findings }`
- Validations: button min-height (44px), required ARIA attributes, color contrast (simple check), focus state presence

**Task E: Wire Tools into Server**
- Register MCP tools: `get-tailwind-theme`, `list-component-stories`, `get-component-deprecated`, `validate-accessibility`
- Add REST mirrors: `GET /tools/get-tailwind-theme`, `GET /tools/list-component-stories`, etc.
- Keep all Phase 1 & 2 routes unchanged

### Out of scope
- **Screenshot/visual regression testing** — requires Playwright, headless browser automation
- **Figma token sync** — requires Figma API credentials and admin access
- **Real-time file watchers** — watching `tailwind.config.ts` for live reloads (deferrable to Phase 4)
- **Advanced a11y validation** — automated contrast checking, focus management analysis (deferred; basic rules only in Phase 3)
- **Component refactoring suggestions** — "this component is deprecated, auto-refactor code" (deferred)

## 4) Implementation Tasks

### Task A: Tailwind Config Loader

**File: `src/loaders/tailwindLoader.ts`**

```ts
import path from "path";
import { loadTailwindConfig } from "../utils/configResolver.js";
import { tailwindThemeSchema, type TailwindTheme } from "../schemas/tailwindTheme.schema.js";

export function loadTailwindTheme(): TailwindTheme {
  const config = loadTailwindConfig();
  const theme = config.theme || {};
  
  return tailwindThemeSchema.parse({
    colors: theme.colors || {},
    spacing: theme.spacing || {},
    breakpoints: theme.breakpoints || {},
    borderRadius: theme.borderRadius || {},
    boxShadow: theme.boxShadow || {},
  });
}
```

**File: `src/schemas/tailwindTheme.schema.ts`**

```ts
import { z } from "zod";

export const tailwindThemeSchema = z.object({
  colors: z.record(z.string()).optional(),
  spacing: z.record(z.string()).optional(),
  breakpoints: z.record(z.string()).optional(),
  borderRadius: z.record(z.string()).optional(),
  boxShadow: z.record(z.string()).optional(),
});

export type TailwindTheme = z.infer<typeof tailwindThemeSchema>;
```

**File: `src/utils/configResolver.ts` (new)**

Utility to detect and load `tailwind.config.ts` or `tailwind.config.js` from project root:

```ts
import path from "path";
import fs from "fs";

export function loadTailwindConfig() {
  const root = process.cwd();
  const tsPath = path.join(root, "tailwind.config.ts");
  const jsPath = path.join(root, "tailwind.config.js");

  let configPath = null;
  if (fs.existsSync(tsPath)) {
    configPath = tsPath;
  } else if (fs.existsSync(jsPath)) {
    configPath = jsPath;
  } else {
    throw new Error("tailwind.config.ts or tailwind.config.js not found");
  }

  // For .ts files, require tsx loader or dynamic import
  // For .js files, use require or dynamic import
  // Return the default export or module.exports
  
  // Simple approach: parse as JSON/JS string (limited)
  // Full approach: use tsx/esbuild to load .ts config dynamically
  
  const content = fs.readFileSync(configPath, "utf-8");
  
  // Basic parsing: extract `theme: { ... }` object
  // Note: This is a simplified approach. For production, use tsx or dynamic import.
  
  return parseThemeFromConfig(content);
}

function parseThemeFromConfig(configContent: string): any {
  // Find the theme object in the config file
  // This is a best-effort parser; for .ts files with complex logic, it may not work
  
  const themeMatch = configContent.match(/theme\s*:\s*({[\s\S]*?}(?=\s*[,}]))/);
  if (!themeMatch) {
    return {};
  }

  try {
    const themeStr = themeMatch[1];
    // Use Function constructor to evaluate the object (unsafe for untrusted input)
    // Better: use a proper JS/TS parser
    return eval(`(${themeStr})`);
  } catch {
    return {};
  }
}
```

**Acceptance Criteria for Task A:**
- `loadTailwindTheme()` successfully loads `tailwind.config.ts` or `tailwind.config.js` from project root
- Returns theme object with keys: `colors`, `spacing`, `breakpoints`, `borderRadius`, `boxShadow`
- If Tailwind config not found, throws error with clear message
- Zod schema validates returned data
- All values are strings (e.g., color hex codes, spacing px values)

---

### Task B: Storybook Parser

**File: `src/loaders/storybookLoader.ts`**

```ts
import path from "path";
import fs from "fs";
import glob from "glob";

export interface ComponentStory {
  name: string;
  args?: Record<string, any>;
  example?: string;
}

export interface ComponentStoriesRegistry {
  [componentName: string]: {
    stories: ComponentStory[];
  };
}

export function loadComponentStories(): ComponentStoriesRegistry {
  const root = process.cwd();
  const storiesDir = path.join(root, "src", "components");
  const storiesPattern = path.join(storiesDir, "**", "*.stories.tsx");

  const storyFiles = glob.sync(storiesPattern);
  const registry: ComponentStoriesRegistry = {};

  for (const filePath of storyFiles) {
    const componentName = extractComponentName(filePath);
    const stories = parseStoriesFile(filePath);

    if (stories.length > 0) {
      registry[componentName] = { stories };
    }
  }

  return registry;
}

function extractComponentName(filePath: string): string {
  // Extract component name from path: src/components/Button/Button.stories.tsx => Button
  const match = filePath.match(/components\/([^/]+)\/[^/]+\.stories\.tsx/);
  return match ? match[1] : path.basename(filePath, ".stories.tsx");
}

function parseStoriesFile(filePath: string): ComponentStory[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const stories: ComponentStory[] = [];

  // Simple regex-based extraction (limited; a full AST parser would be better)
  // Look for: const Button = { title: "Button", component: Button };
  // Then: export const Primary = (args) => <Button {...args} />;

  const storyExports = content.match(/export\s+const\s+(\w+)\s*=/g) || [];
  
  for (const match of storyExports) {
    const storyName = match.replace(/export\s+const\s+(\w+)\s*=.*/, "$1");
    if (storyName !== "default") {
      stories.push({
        name: storyName,
        example: `<Component name="${storyName}" />`,
      });
    }
  }

  return stories;
}
```

**Acceptance Criteria for Task B:**
- Discovers all `.stories.tsx` files in `src/components/**`
- Extracts component name from file path
- Extracts story names (exported const identifiers) from each file
- Returns registry: `{ [componentName]: { stories: [{ name, example }] } }`
- If no stories found, returns empty registry (no error)
- Works with typical Storybook 6.x+ setup

---

### Task C: Component Deprecation Metadata

**Update `src/registry/components.json`**

Extend each component entry with optional deprecation fields:

```json
{
  "Button": {
    "description": "Primary action button",
    "props": { "variant": ["primary", "secondary"], "size": ["sm", "md", "lg"] },
    "examples": ["<Button variant='primary'>Save</Button>"],
    "tags": ["actions", "forms", "cta"],
    "deprecated": false
  },
  "ButtonLegacy": {
    "description": "Old button component (deprecated)",
    "props": { "variant": ["default"] },
    "examples": ["<ButtonLegacy>Click</ButtonLegacy>"],
    "tags": ["actions"],
    "deprecated": true,
    "deprecatedVersion": "2.0.0",
    "replacement": "Button",
    "migrationNotes": "ButtonLegacy was renamed to Button. Update all imports from ButtonLegacy to Button and use the new prop API."
  }
}
```

**File: `src/schemas/component.schema.ts` (extend existing)**

```ts
import { z } from "zod";

const componentDefinitionSchema = z.object({
  description: z.string(),
  props: z.record(z.array(z.string())),
  examples: z.array(z.string()),
  tags: z.array(z.string()),
  deprecated: z.boolean().optional(),
  deprecatedVersion: z.string().optional(),
  replacement: z.string().optional(),
  migrationNotes: z.string().optional(),
});

export type ComponentDefinition = z.infer<typeof componentDefinitionSchema>;
```

**File: `src/tools/getComponentDeprecated.ts` (new)**

```ts
import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";

export interface DeprecatedComponentInfo {
  name: string;
  reason: string;
  replacement: string;
  migrationNotes: string;
}

export function getComponentDeprecated(): DeprecatedComponentInfo[] {
  const registry = loadComponentRegistry();
  const deprecated: DeprecatedComponentInfo[] = [];

  for (const [name, definition] of Object.entries(registry)) {
    if (definition.deprecated) {
      deprecated.push({
        name,
        reason: `Deprecated in version ${definition.deprecatedVersion || "unknown"}`,
        replacement: definition.replacement || "unknown",
        migrationNotes: definition.migrationNotes || "",
      });
    }
  }

  return deprecated;
}
```

**Acceptance Criteria for Task C:**
- `components.json` includes optional fields: `deprecated`, `deprecatedVersion`, `replacement`, `migrationNotes`
- Zod schema validates the extended component definition
- `getComponentDeprecated()` returns array of deprecated components
- Each entry includes: name, reason (version), replacement, migration notes
- If no deprecated components, returns empty array

---

### Task D: Accessibility Validation Tool

**File: `src/schemas/a11y.schema.ts`**

```ts
import { z } from "zod";

export const a11yFindingSchema = z.object({
  field: z.string(),
  valid: z.boolean(),
  code: z.string(),
  message: z.string(),
});

export const validateA11yInputSchema = z.object({
  componentName: z.string(),
  props: z.record(z.any()).optional(),
});

export const validateA11yOutputSchema = z.object({
  valid: z.boolean(),
  findings: z.array(a11yFindingSchema),
});

export type A11yFinding = z.infer<typeof a11yFindingSchema>;
export type ValidateA11yInput = z.infer<typeof validateA11yInputSchema>;
export type ValidateA11yOutput = z.infer<typeof validateA11yOutputSchema>;
```

**File: `src/tools/validateAccessibility.ts`**

```ts
import { loadComponentRegistry } from "../loaders/componentRegistryLoader.js";
import { loadTheme } from "../loaders/themeLoader.js";
import {
  validateA11yInputSchema,
  type ValidateA11yInput,
  type ValidateA11yOutput,
  type A11yFinding,
} from "../schemas/a11y.schema.js";

export function validateAccessibility(input: ValidateA11yInput): ValidateA11yOutput {
  const findings: A11yFinding[] = [];

  const registry = loadComponentRegistry();
  const componentDef = registry[input.componentName];

  if (!componentDef) {
    findings.push({
      field: "componentName",
      valid: false,
      code: "COMPONENT_NOT_FOUND",
      message: `Component '${input.componentName}' not found.`,
    });
    return { valid: false, findings };
  }

  const theme = loadTheme("default");
  const props = input.props || {};

  // Rule 1: Button/interactive elements must have min-height of 44px
  if (isInteractive(input.componentName)) {
    const hasMinHeight = Object.values(theme.a11y || {})
      .some(rule => (rule as any).buttonMinHeight === "44px");

    findings.push({
      field: "a11y.buttonMinHeight",
      valid: hasMinHeight,
      code: hasMinHeight ? "A11Y_BUTTON_HEIGHT_VALID" : "A11Y_BUTTON_HEIGHT_INVALID",
      message: hasMinHeight
        ? "Button meets minimum touch target size (44px)."
        : "Button should have minimum height of 44px.",
    });
  }

  // Rule 2: Check for required ARIA attributes
  if (theme.a11y?.requiredAria) {
    const hasAriaLabel = props.ariaLabel || props["aria-label"];

    findings.push({
      field: "a11y.ariaLabel",
      valid: !!hasAriaLabel,
      code: hasAriaLabel ? "A11Y_ARIA_VALID" : "A11Y_ARIA_MISSING",
      message: hasAriaLabel
        ? "Component has ARIA label."
        : "Component should have aria-label or ariaLabel prop.",
    });
  }

  // Rule 3: Check for color contrast (simplified)
  if (props.color && props.backgroundColor) {
    // Simple check: both colors should exist in theme
    const themeColors = Object.values(theme.colors || {});
    const colorValid = themeColors.includes(props.color);
    const bgValid = themeColors.includes(props.backgroundColor);

    findings.push({
      field: "a11y.colorContrast",
      valid: colorValid && bgValid,
      code: colorValid && bgValid ? "A11Y_CONTRAST_VALID" : "A11Y_CONTRAST_INVALID",
      message:
        colorValid && bgValid
          ? "Colors are from design system (contrast assumed valid)."
          : "Use colors from design system to ensure contrast compliance.",
    });
  }

  return {
    valid: findings.every(f => f.valid),
    findings,
  };
}

function isInteractive(componentName: string): boolean {
  return ["Button", "Input", "Link", "Checkbox", "Radio"].includes(componentName);
}
```

**Acceptance Criteria for Task D:**
- Tool accepts `{ componentName, props }` and returns `{ valid, findings }`
- Validates button min-height rule (44px)
- Validates required ARIA attributes
- Validates color contrast (simplified: checks if colors are in theme)
- Returns array of findings with `field`, `valid`, `code`, `message`
- Works with any component; returns appropriate findings

---

### Task E: Wire New Tools into Server

**Update `src/server.ts`**

Add imports:

```ts
import { getTailwindTheme } from "./tools/getTailwindTheme.js";
import { listComponentStories } from "./tools/listComponentStories.js";
import { getComponentDeprecated } from "./tools/getComponentDeprecated.js";
import { validateAccessibility } from "./tools/validateAccessibility.js";
```

Register MCP tools and add REST mirrors:

```ts
// Tool 7: get-tailwind-theme
server.registerTool(
  "get-tailwind-theme",
  { description: "Fetch Tailwind theme configuration (colors, spacing, breakpoints)." },
  async () => {
    try {
      const theme = getTailwindTheme();
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, data: theme }) }],
      };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: { code: "TAILWIND_CONFIG_NOT_FOUND", message: "tailwind.config not found" },
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

// Tool 8: list-component-stories
server.registerTool(
  "list-component-stories",
  { description: "List all component stories from Storybook files." },
  async () => {
    try {
      const stories = listComponentStories();
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, data: stories }) }],
      };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: { code: "STORYBOOK_NOT_FOUND", message: "No stories found" },
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

// Tool 9: get-component-deprecated
server.registerTool(
  "get-component-deprecated",
  { description: "List all deprecated components and their replacements." },
  async () => {
    const deprecated = getComponentDeprecated();
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, data: deprecated }) }],
    };
  },
);

// Tool 10: validate-accessibility
server.registerTool(
  "validate-accessibility",
  {
    description: "Validate a component for accessibility compliance.",
    inputSchema: {
      componentName: z.string().describe("Component name"),
      props: z.record(z.any()).optional().describe("Component props"),
    },
  },
  async ({ componentName, props }) => {
    const result = validateAccessibility({ componentName, props });
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, data: result }) }],
    };
  },
);
```

REST endpoints:

```ts
app.get("/tools/get-tailwind-theme", async (request, reply) => {
  try {
    const theme = getTailwindTheme();
    return { success: true, data: theme };
  } catch {
    return reply.code(404).send({
      success: false,
      error: { code: "TAILWIND_CONFIG_NOT_FOUND", message: "tailwind.config not found" },
    });
  }
});

app.get("/tools/list-component-stories", async (request, reply) => {
  try {
    const stories = listComponentStories();
    return { success: true, data: stories };
  } catch {
    return reply.code(404).send({
      success: false,
      error: { code: "STORYBOOK_NOT_FOUND", message: "No stories found" },
    });
  }
});

app.get("/tools/get-component-deprecated", async () => {
  const deprecated = getComponentDeprecated();
  return { success: true, data: deprecated };
});

app.post<{ Body: { componentName: string; props?: Record<string, any> } }>(
  "/tools/validate-accessibility",
  async (request) => {
    const result = validateAccessibility(request.body);
    return { success: true, data: result };
  },
);
```

**Acceptance Criteria for Task E:**
- All 4 new tools registered with MCP SDK
- All 4 new tools have REST mirrors
- `npm run build` succeeds with zero errors
- `npm run dev` starts without runtime errors
- All Phase 1 & 2 endpoints still work
- All Phase 3 endpoints respond with correct data or expected errors

---

## 5) Acceptance Criteria (Phase 3 Complete)

Phase 3 is complete when all are true:

### Build & Runtime
- `npm run build` succeeds with zero TypeScript errors
- `npm run dev` starts without errors; all Phase 1, 2, and 3 endpoints respond correctly

### Tool 7: get-tailwind-theme
- Returns theme object with keys: `colors`, `spacing`, `breakpoints`, `borderRadius`, `boxShadow`
- `GET /tools/get-tailwind-theme` returns 200 with theme data
- If `tailwind.config.ts` or `tailwind.config.js` not found, returns 404 with `code: "TAILWIND_CONFIG_NOT_FOUND"`
- MCP tool works via `POST /mcp`

### Tool 8: list-component-stories
- Discovers all `.stories.tsx` files in `src/components/**`
- Returns registry: `{ [componentName]: { stories: [{ name, example }] } }`
- `GET /tools/list-component-stories` returns 200 with stories data
- If no stories found, returns 200 with empty object `{}`
- MCP tool works via `POST /mcp`

### Tool 9: get-component-deprecated
- Returns array of deprecated components with `name`, `reason`, `replacement`, `migrationNotes`
- `GET /tools/get-component-deprecated` returns 200 with deprecated list
- If no deprecated components, returns 200 with empty array `[]`
- MCP tool works via `POST /mcp`

### Tool 10: validate-accessibility
- Accepts `{ componentName, props }` and returns `{ valid, findings }`
- Validates button min-height (44px) for interactive components
- Validates ARIA attributes for components with `a11y.requiredAria` rule
- Validates color contrast (simplified)
- Returns findings with `field`, `valid`, `code`, `message`
- `POST /tools/validate-accessibility` returns 200 with validation data
- MCP tool works via `POST /mcp`

### Integration
- `components.json` includes optional deprecation fields: `deprecated`, `deprecatedVersion`, `replacement`, `migrationNotes`
- Component schema extended to validate deprecation fields
- All Phase 1 & 2 tools still work without changes

---

## 6) Recommended Execution Order

1. **Task A (Tailwind Loader)** — Create config resolver, schema, and loader (no dependencies)
2. **Task C (Deprecation Metadata)** — Update `components.json` and schema, implement tool (depends only on Phase 1 loaders)
3. **Task B (Storybook Parser)** — Create loader and tool (depends on `glob` package; optional Task E dependency)
4. **Task D (Accessibility Validation)** — Create schemas and tool (depends only on Phase 1 loaders)
5. **Task E (Server Wiring)** — Register all 4 tools and add REST mirrors (depends on Tasks A, B, C, D)

Tasks A, C, D can run in parallel. Task B is independent. Task E depends on all others.

---

## 7) Dependencies & Packages

### New npm packages needed
- `glob` — for discovering `.stories.tsx` files (if not already installed)
  ```bash
  npm install glob
  npm install -D @types/glob
  ```

### No breaking changes
- All Phase 1 & 2 tools remain unchanged
- No modifications to existing loaders, schemas, or server routes
- Pure additive: new loaders, new tools, new REST endpoints, new registry fields

---

## 8) What To Do Next

**Start Tasks A, C, D in parallel:**

1. **Task A**: Create `src/loaders/tailwindLoader.ts`, `src/schemas/tailwindTheme.schema.ts`, `src/utils/configResolver.ts`, and `src/tools/getTailwindTheme.ts`

2. **Task C**: Update `src/registry/components.json` with optional deprecation fields (add one deprecated component as example); extend `src/schemas/component.schema.ts`; implement `src/tools/getComponentDeprecated.ts`

3. **Task D**: Create `src/schemas/a11y.schema.ts` and `src/tools/validateAccessibility.ts`

Once these three are done, move to Task B (Storybook parser), then Task E (server wiring).

---

## 9) Phase 4 Candidates (Future)

Once Phase 3 is shipped, consider:
- **Real-time file watchers** for Tailwind and Storybook changes
- **Advanced accessibility validation** using axe-core or similar
- **Component refactoring tool** that auto-rewrites deprecated component usage
- **Design token drift detection** — compare theme against Figma
- **Screenshot-based validation** using Playwright
- **Deprecation warnings in generated code** — AI comments about deprecated components it used
