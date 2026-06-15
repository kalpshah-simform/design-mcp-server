# Phase 2 Plan: Layout Patterns, Design Validation, and Search Refactor

## 1) Current Implementation Review

### Completed
- TypeScript project with NodeNext/strict mode, Fastify, MCP SDK, and Zod fully configured.
- `themes/default.json`, `themes/customer-a.json`, `themes/customer-b.json` — design token files covering colors, typography, spacing, radius, shadows, and a11y rules.
- `src/registry/components.json` — 5 components (Button, Input, Card, Modal, DataTable) with props, examples, and tags.
- `src/loaders/themeLoader.ts` — reads a theme JSON by name via `readFileSync`.
- `src/loaders/componentRegistryLoader.ts` — reads and Zod-validates the component registry.
- `src/schemas/component.schema.ts` — `ComponentDefinition` and `ComponentRegistry` Zod types.
- `src/tools/getTheme.ts`, `listComponents.ts`, `getComponentDetails.ts`, `searchComponents.ts` — 4 MVP tools, each a single exported function.
- `src/server.ts` — MCP `registerTool()` for all 4 tools + REST mirrors at `GET /tools/*`; MCP transport at `POST /` and `POST /mcp`.
- Error envelope pattern: `{ success: false, error: { code: "...", message: "..." } }` consistent across all endpoints.

### Not Implemented Yet (Phase 2 scope)
- `get-layout-patterns` tool — no layout pattern data file or loader exists.
- `validate-design` tool — no validation logic, input schema, or rule engine exists.
- `src/utils/search.ts` — `tokenizeQuery` is currently inlined inside `searchComponents.ts` and is not reusable.
- `src/schemas/layoutPattern.schema.ts` — Zod types for layout pattern data.
- `src/schemas/validation.schema.ts` — Zod input/output shapes for validate-design.
- `src/layouts/patterns.json` — layout pattern data file.

## 2) Phase 2 Goal

Extend the MCP server with two new tools that let AI go from component awareness to full-page scaffolding and active correctness checking:

- `get-layout-patterns` — AI retrieves reusable page templates (dashboard, auth, form, settings) with slot definitions and suggested components, enabling one-call page scaffolding.
- `validate-design` — AI submits a list of component names and color token values; the server validates them against the live component registry and loaded theme, returning structured pass/fail findings.

A shared refactor (`tokenizeQuery` extraction) is done in the same phase to eliminate duplication and make the search utility available to the new tools.

## 3) Scope (Phase 2 Only)

### In scope
- `src/layouts/patterns.json` — static data file with 4 named layout patterns.
- `src/schemas/layoutPattern.schema.ts` — Zod schema and TypeScript types for layout pattern data.
- `src/loaders/layoutPatternLoader.ts` — same pattern as `componentRegistryLoader.ts`.
- `src/utils/search.ts` — extracts `tokenizeQuery` from `searchComponents.ts` as a shared utility.
- `src/tools/getLayoutPatterns.ts` — accepts optional `category` filter and optional `q` search query.
- `src/tools/validateDesign.ts` — accepts `{ components, colors, theme }`, returns structured findings.
- `src/schemas/validation.schema.ts` — Zod input/output shapes for validate-design.
- Server wiring: `server.registerTool()` + REST mirrors for both new tools.
- Update `searchComponents.ts` to import `tokenizeQuery` from `src/utils/search.ts`.

### Out of scope
- Tailwind config parsing — requires a project-specific `tailwind.config.ts` that does not exist in this repo.
- Storybook integration — requires external `.stories.tsx` parsing; deferred to Phase 3.
- Accessibility audit automation (contrast ratios, focus state linting) — deferred.
- Deprecated component detection — deferred to Phase 3.

## 4) Implementation Tasks

## Task A: Create layout pattern data and schema

- Create `src/layouts/patterns.json` with 4 patterns. Each entry must include:
  - `id` (string, kebab-case): `"dashboard"`, `"auth"`, `"form"`, `"settings"`
  - `name` (string): human-readable title
  - `description` (string): one-sentence purpose
  - `tags` (string[]): for search matching
  - `slots` (object): named regions with `description` and `suggestedComponents` string array
  - `example` (string): a representative JSX stub

  Patterns to include:
  - `dashboard` — sidebar + main content with card grid; slots: `header`, `sidebar`, `main`, `footer`; tags: `["admin", "data", "overview", "cards", "navigation"]`
  - `auth` — centred single-column card (login/register); slots: `logo`, `main`, `footer`; tags: `["auth", "login", "register", "forms", "public"]`
  - `form` — two-column label+field layout with action bar; slots: `header`, `main`, `actions`; tags: `["form", "settings", "data-entry", "fields"]`
  - `settings` — sidebar nav + content panel; slots: `sidebar`, `main`; tags: `["settings", "account", "preferences", "navigation"]`

- Create `src/schemas/layoutPattern.schema.ts`:
  - `slotSchema` — `{ description: z.string(), suggestedComponents: z.array(z.string()) }`
  - `layoutPatternSchema` — `{ id, name, description, tags, slots: z.record(z.string(), slotSchema), example: z.string() }`
  - `layoutPatternRegistrySchema` — `z.record(z.string(), layoutPatternSchema)`
  - Export types: `SlotDefinition`, `LayoutPattern`, `LayoutPatternRegistry`

## Task B: Add layout pattern loader

- Create `src/loaders/layoutPatternLoader.ts`:
  - `loadLayoutPatternRegistry(): LayoutPatternRegistry`
  - Use `path.join(process.cwd(), "src", "layouts", "patterns.json")`
  - `readFileSync` + `JSON.parse` + `layoutPatternRegistrySchema.parse(data)`
  - Same pattern as `componentRegistryLoader.ts`

## Task C: Extract tokenizeQuery to shared utility

- Create `src/utils/search.ts`:
  - Move `tokenizeQuery` function verbatim from `searchComponents.ts`
  - `export function tokenizeQuery(query: string): string[]`
- Update `src/tools/searchComponents.ts`:
  - Remove local `tokenizeQuery` definition
  - Add: `import { tokenizeQuery } from "../utils/search.js";`
  - No other logic changes

## Task D: Implement the get-layout-patterns tool

- Create `src/tools/getLayoutPatterns.ts`:
  - Import `loadLayoutPatternRegistry` from `"../loaders/layoutPatternLoader.js"`
  - Import `tokenizeQuery` from `"../utils/search.js"`
  - Export `function getLayoutPatterns(options: { category?: string; q?: string })`:
    - If `category` provided: filter by `id` (case-insensitive); return `null` if no match
    - If `q` provided: tokenize, score each pattern against `[name, description, ...tags]`, filter score > 0, sort by score desc then by id
    - If neither: return all patterns as an array
    - Return type: `LayoutPattern[]` (full objects with slots and example, not just names)

## Task E: Implement the validate-design tool

- Create `src/schemas/validation.schema.ts`:
  - `validateDesignInputSchema`: `{ components: z.array(z.string()).min(1), colors: z.record(z.string(), z.string()).optional(), theme: z.string().optional() }`
  - `findingSchema`: `{ field: z.string(), value: z.string(), valid: z.boolean(), code: z.string(), message: z.string() }`
  - `validateDesignOutputSchema`: `{ valid: z.boolean(), findings: z.array(findingSchema) }`
  - Export types: `ValidateDesignInput`, `Finding`, `ValidateDesignOutput`

- Create `src/tools/validateDesign.ts`:
  - Import `loadComponentRegistry` from `"../loaders/componentRegistryLoader.js"`
  - Import `loadTheme` from `"../loaders/themeLoader.js"`
  - Export `function validateDesign(input: ValidateDesignInput): ValidateDesignOutput`:
    - Parse input with `validateDesignInputSchema.parse(input)`
    - Load theme (`input.theme ?? "default"`); on error emit finding `{ field: "theme", code: "THEME_NOT_FOUND", valid: false }`
    - For each `input.components[i]`: check `registry[name]`; emit `valid: true` if found, `valid: false` + `code: "UNKNOWN_COMPONENT"` if not
    - For each key in `input.colors`: check value against `Object.values(theme.colors)`; emit `valid: false` + `code: "INVALID_COLOR_TOKEN"` if not found
    - Return `{ valid: findings.every(f => f.valid), findings }`

## Task F: Wire new tools into server

- In `src/server.ts`:
  - Import `getLayoutPatterns` and `validateDesign`
  - Register MCP tool `"get-layout-patterns"` with `inputSchema: { category: z.string().optional(), q: z.string().optional() }`; return `isError: true` with `LAYOUT_NOT_FOUND` if result is null
  - Register MCP tool `"validate-design"` with `inputSchema: { components: z.array(z.string()), colors: z.record(...).optional(), theme: z.string().optional() }`; always return `success: true` (findings are data, not server errors)
  - Add `GET /tools/get-layout-patterns` with optional `?category=` and `?q=` query params
  - Add `POST /tools/validate-design` (POST because payload is a structured body, not URL-safe)
  - Keep all existing Phase 1 routes unchanged

## 5) Acceptance Criteria

Phase 2 is complete when all are true:

- `npm run build` succeeds with zero TypeScript errors.
- `npm run dev` starts without runtime errors and all Phase 1 endpoints still return correct responses.
- `GET /tools/get-layout-patterns` returns all 4 patterns, each with `id`, `name`, `description`, `tags`, `slots`, and `example`.
- `GET /tools/get-layout-patterns?category=dashboard` returns exactly 1 pattern with `id: "dashboard"`.
- `GET /tools/get-layout-patterns?category=nonexistent` returns `{ success: false, error: { code: "LAYOUT_NOT_FOUND" } }` with HTTP 404.
- `GET /tools/get-layout-patterns?q=auth+login` returns the `auth` pattern (tag match).
- `POST /tools/validate-design` with `{ "components": ["Button"], "colors": { "primary": "#0052CC" }, "theme": "default" }` returns `{ valid: true, findings: [...] }` with all findings valid.
- `POST /tools/validate-design` with `{ "components": ["Button", "GhostWidget"] }` returns `valid: false` with finding `{ field: "components[1]", code: "UNKNOWN_COMPONENT" }`.
- `POST /tools/validate-design` with `{ "components": ["Button"], "colors": { "primary": "#FF0000" } }` returns `valid: false` with finding `code: "INVALID_COLOR_TOKEN"`.
- `POST /tools/validate-design` with `{ "components": [] }` returns HTTP 400 with `code: "INVALID_REQUEST"`.
- Both new MCP tools respond correctly via `POST /mcp` with JSON-RPC.
- `src/tools/searchComponents.ts` imports `tokenizeQuery` from `src/utils/search.ts` (no local copy).

## 6) Recommended Execution Order

1. Task A (layout pattern data + schema — establishes the data contract)
2. Task C (extract `tokenizeQuery` to utils — isolated refactor, unblocks Task D)
3. Task B (layout pattern loader — depends on Task A schema)
4. Task D (`getLayoutPatterns` tool — depends on Tasks B and C)
5. Task E (`validateDesign` tool + validation schema — depends on Phase 1 loaders only)
6. Task F (server wiring for both new tools — depends on Tasks D and E)

## 7) What To Do Next Immediately

Start Task A and Task C in parallel — they have no mutual dependencies. Draft `src/layouts/patterns.json` (all 4 patterns) and `src/schemas/layoutPattern.schema.ts` in one pass, while simultaneously moving `tokenizeQuery` to `src/utils/search.ts` and verifying `searchComponents.ts` still works. This gives a clean data contract and a shared utility before any new tool logic is written — the same vertical-slice approach that de-risked Phase 1.
