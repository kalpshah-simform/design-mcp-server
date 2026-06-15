# Phase 1 Plan: MCP MVP Foundation

## 1) Current Implementation Review

### Completed
- TypeScript project bootstrapped.
- Fastify server is running with `/health` endpoint.
- Build and runtime scripts are configured in `package.json`.
- `tsconfig.json` is configured for NodeNext + strict mode.

### Not Implemented Yet (MVP scope from guide)
- `get_theme` tool.
- `list_components` tool.
- `get_component_details` tool.
- `search_components` tool.
- Theme JSON files (`themes/default.json`, etc.).
- Component registry (`src/registry/components.json`).
- Theme loader (`src/loaders/themeLoader.ts`).

## 2) Phase 1 Goal

Deliver a working MCP MVP that can expose design system data to AI tools with these core capabilities:
- Read theme tokens.
- List available components.
- Return component details.
- Search components by intent/tags.

## 3) Scope (Phase 1 Only)

### In scope
- Data source setup (theme files + component registry).
- Loader and schema basics.
- 4 MVP tool handlers.
- Tool wiring in server.
- Basic validation and error handling.
- Manual test flow (local calls).

### Out of scope
- Layout patterns tool.
- Design validation engine.
- Storybook parsing.
- Tailwind config parsing.
- Accessibility audit automation.

## 4) Implementation Tasks

## Task A: Create data foundations
- Add `themes/default.json` with colors/spacing/typography/radius/shadows.
- Add `themes/customer-a.json` and `themes/customer-b.json` as white-label variants.
- Add `src/registry/components.json` with at least:
  - Button
  - Input
  - Card
  - Modal
  - DataTable

## Task B: Add loaders and types
- Add `src/loaders/themeLoader.ts` to read theme JSON by name.
- Add `src/loaders/componentRegistryLoader.ts` to load component definitions.
- Add `src/schemas/component.schema.ts` (Zod) for component record validation.

## Task C: Implement MVP tools
- Add `src/tools/getTheme.ts`.
- Add `src/tools/listComponents.ts`.
- Add `src/tools/getComponentDetails.ts`.
- Add `src/tools/searchComponents.ts`.

## Task D: Wire server endpoints
- Add HTTP endpoints (initial MVP transport):
  - `GET /tools/get-theme?theme=default`
  - `GET /tools/list-components`
  - `GET /tools/get-component-details?name=Button`
  - `GET /tools/search-components?q=table+pagination`
- Keep `/health` endpoint.

## Task E: Verify and harden
- Add input validation for query params.
- Add 404 handling for unknown components/themes.
- Add clear JSON error shape.
- Smoke-test all endpoints.

## 5) Acceptance Criteria

Phase 1 is complete when all are true:
- `npm run build` succeeds.
- `npm run dev` starts server without runtime errors.
- All 4 MVP endpoints return correct JSON.
- Unknown theme/component requests return safe, structured errors.
- Component search returns useful results by tags/description/name.

## 6) Recommended Execution Order

1. Task A (data files)
2. Task B (loaders + schemas)
3. Task C (tool logic)
4. Task D (server wiring)
5. Task E (validation + testing)

## 7) What To Do Next Immediately

Start with Task A + Task B in one pass, then wire `get_theme` first. This gives a vertical slice quickly and de-risks file format/loading issues before adding search and detail tools.
