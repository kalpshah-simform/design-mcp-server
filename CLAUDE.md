# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Design System MCP Server** is a Model Context Protocol (MCP) server that exposes a design system to AI tools (GitHub Copilot, Cursor, Claude Desktop, etc.). It allows AI code generation to be aware of design tokens, components, and design rules.

The server runs on `http://localhost:3000` and provides HTTP endpoints for:
- Fetching theme tokens (colors, typography, spacing, shadows, accessibility rules)
- Listing available components
- Getting detailed component metadata (props, examples, tags)
- Searching components by natural language intent

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (auto-reload with tsx)
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm run start

# Health check
curl http://localhost:3000/health
```

## Project Structure

```
src/
├── server.ts                 # Fastify HTTP server + MCP SDK setup
├── tools/                    # Tool implementations
│   ├── getTheme.ts          # Fetch design tokens for a theme
│   ├── listComponents.ts    # List all available components
│   ├── getComponentDetails.ts # Get component props, examples, tags
│   └── searchComponents.ts  # Search components by natural language
├── loaders/                  # Data loading logic
│   ├── themeLoader.ts       # Read theme JSON files
│   └── componentRegistryLoader.ts # Load component registry with validation
├── schemas/                  # Zod schemas
│   └── component.schema.ts  # ComponentDefinition and ComponentRegistry types
└── registry/
    └── components.json      # Component metadata (name, props, examples, tags)

themes/                        # Theme token files (JSON)
├── default.json             # Default blue brand theme
├── customer-a.json          # Green white-label variant
└── customer-b.json          # Orange white-label variant
```

## Key Architecture Patterns

### 1. Dual HTTP + MCP Transport
- `server.ts` registers tools with MCP SDK (`registerTool`)
- Same tools exposed via REST endpoints (`app.get`, `app.post`)
- MCP endpoints at `POST /` and `POST /mcp` for streamable HTTP clients
- REST endpoints at `GET /tools/*` for backward compatibility
- Both transports return the same JSON envelope: `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`

### 2. Data Loading
- **Themes**: JSON files in `themes/` directory, loaded by `themeLoader.ts`
- **Components**: Single registry in `src/registry/components.json`, loaded by `componentRegistryLoader.ts`
- Both use `readFileSync` at request time (no caching layer yet)
- Component registry validated against `componentRegistrySchema` at load time

### 3. Component Schema (Zod)
```ts
{
  [componentName]: {
    description: string,           // e.g., "Primary action button"
    props: Record<string, string[]>, // e.g., { variant: ["primary", "secondary"], size: ["sm", "md", "lg"] }
    examples: string[],            // JSX code snippets
    tags: string[]                 // Searchable tags for semantic discovery
  }
}
```

### 4. Search Implementation
- `searchComponents.ts` uses token-based matching
- Tokenizes query and component metadata (name, description, tags)
- Scores by number of matching tokens
- Returns results sorted by relevance score, then alphabetically

### 5. Error Handling
- Theme not found → 404 with `{ code: "THEME_NOT_FOUND", message: "..." }`
- Component not found → 404 with `{ code: "COMPONENT_NOT_FOUND", message: "..." }`
- Invalid request (missing params) → 400 with `{ code: "INVALID_REQUEST", message: "..." }`
- MCP tools return `isError: true` flag; HTTP endpoints set appropriate status codes

## Common Development Tasks

### Adding a New Theme
1. Create `themes/new-theme-name.json` with structure:
   ```json
   {
     "colors": { "primary": "#...", ... },
     "typography": { "fontFamily": "...", "fontSize": { "sm": "...", ... } },
     "spacing": { "xs": "...", "sm": "...", ... },
     "radius": { "sm": "...", ... },
     "shadows": { "sm": "...", ... },
     "a11y": { "buttonMinHeight": "44px", "requiredAria": true }
   }
   ```
2. Restart the server; `getTheme("new-theme-name")` will load it automatically

### Adding a New Component
1. Add entry to `src/registry/components.json`:
   ```json
   {
     "ComponentName": {
       "description": "...",
       "props": { "propName": ["option1", "option2"] },
       "examples": ["<ComponentName prop=\"value\">...</ComponentName>"],
       "tags": ["category", "use-case"]
     }
   }
   ```
2. Restart the server; component will be discoverable via `list-components` and `search-components`

### Testing Endpoints Locally
```bash
# Start dev server
npm run dev

# In another terminal, test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/tools/list-components
curl http://localhost:3000/tools/get-theme?theme=default
curl http://localhost:3000/tools/get-component-details?name=Button
curl "http://localhost:3000/tools/search-components?q=table+pagination"
```

## Future Development Guidance

**Phase 1 (MVP, current)**: 4 core tools — get-theme, list-components, get-component-details, search-components.

**Phase 2 candidates** (mentioned in design-system-mcp-guide.md):
- `get-layout-patterns` — expose reusable dashboard/form/auth page layouts
- `validate-design` — AI submits JSX, server validates against design system rules
- Tailwind config parsing
- Storybook integration (parse stories.tsx for component metadata)
- Accessibility audit tools

**Key principle**: MCP tools should be **read-only endpoints for design data**. Each tool fetches current registry/theme data, validates query params, and returns structured JSON. When adding tools, follow the same pattern: load data → validate → return envelope or error.

## TypeScript & Build Notes

- `tsconfig.json` uses `ES2022` target and `NodeNext` module resolution (native ESM)
- Strict mode enabled; all types are explicitly checked
- `rootDir: "src"`, `outDir: "dist"`
- Run `npm run build` before `npm start` for production

## Testing

Currently no automated test suite (`npm test` exits with error). Manual endpoint testing is the current verification approach. A future task might add Jest or Vitest for unit testing loaders and tool logic.