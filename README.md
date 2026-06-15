# Design System MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes your design system to AI coding tools — GitHub Copilot, Cursor, Claude Desktop, and any MCP-compatible client. AI agents can query design tokens, discover components, validate design decisions, and check accessibility rules in real time.

---

## Features

- **Design token access** — colors, typography, spacing, radius, shadows, a11y rules per theme
- **Component registry** — list, search, and fetch full metadata (props, examples, tags) for every component
- **Layout patterns** — reusable page templates (dashboard, auth, form, settings)
- **Design validation** — check component names and color tokens against a theme
- **Accessibility audit** — validate components against WCAG touch targets and ARIA rules
- **Tailwind config parsing** — expose your actual `tailwind.config.ts` values to AI tools
- **Storybook integration** — surface real story examples from `*.stories.tsx` files
- **Multi-theme support** — switch between `default`, `customer-a`, `customer-b`, or any custom theme
- **Dual transport** — MCP (Streamable HTTP) + REST endpoints for backward compatibility

---

## Quickstart

```bash
# Install dependencies
npm install

# Start in development mode (auto-reload)
npm run dev

# Verify the server is running
curl http://localhost:3000/health
```

The server listens on `http://localhost:3000`.

---

## Connecting AI Tools

### GitHub Copilot / VS Code

Add to `.vscode/settings.json` (or your user settings):

```json
{
  "mcp": {
    "servers": {
      "design-system": {
        "type": "http",
        "url": "http://localhost:3000"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "design-system": {
      "command": "node",
      "args": ["/path/to/design-mcp-server/dist/server.js"]
    }
  }
}
```

Run `npm run build` first to produce `dist/server.js`.

### Cursor

Add under **Settings → MCP Servers**:

```json
{
  "name": "design-system",
  "type": "http",
  "url": "http://localhost:3000"
}
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `get-theme` | Fetch all design tokens (colors, typography, spacing, etc.) for a theme |
| `list-components` | List every component in the registry (including deprecated ones) |
| `get-component-details` | Get full metadata — props, examples, tags — for a specific component |
| `search-components` | Find components by natural-language intent (e.g. "table with pagination") |
| `get-layout-patterns` | Retrieve reusable page layout templates, optionally filtered by category |
| `validate-design` | Check component names and color tokens against a theme's rules |
| `validate-accessibility` | Audit a component for WCAG touch targets and ARIA requirements |
| `get-tailwind-theme` | Return parsed values from your project's `tailwind.config.ts` |
| `get-component-deprecated` | List deprecated components and their recommended replacements |
| `list-component-stories` | Surface story examples discovered from `*.stories.tsx` files |

---

## REST Endpoints

All tools are also available as plain HTTP endpoints for scripting or backward compatibility.

```bash
# Health check
curl http://localhost:3000/health

# Fetch a theme
curl "http://localhost:3000/tools/get-theme?theme=default"

# List all components
curl http://localhost:3000/tools/list-components

# Get component metadata
curl "http://localhost:3000/tools/get-component-details?name=Button"

# Search components
curl "http://localhost:3000/tools/search-components?q=table+with+pagination"

# Get layout patterns
curl "http://localhost:3000/tools/get-layout-patterns?category=dashboard"

# Validate design (POST)
curl -X POST http://localhost:3000/tools/validate-design \
  -H "Content-Type: application/json" \
  -d '{"components": ["Button", "Modal"], "colors": {"primary": "#0052CC"}, "theme": "default"}'

# Validate accessibility (POST)
curl -X POST http://localhost:3000/tools/validate-accessibility \
  -H "Content-Type: application/json" \
  -d '{"componentName": "Button", "props": {"aria-label": "Save"}, "theme": "default"}'

# Tailwind config values
curl http://localhost:3000/tools/get-tailwind-theme

# Deprecated components
curl http://localhost:3000/tools/get-component-deprecated
```

All responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "THEME_NOT_FOUND", "message": "..." } }
```

---

## Themes

Three themes ship out of the box:

| Theme | Description |
|-------|-------------|
| `default` | Blue brand theme |
| `customer-a` | Green white-label variant |
| `customer-b` | Orange white-label variant |

### Adding a custom theme

Create `themes/<name>.json`:

```json
{
  "colors": { "primary": "#...", "secondary": "#..." },
  "typography": { "fontFamily": "Inter", "fontSize": { "sm": "12px", "md": "14px" } },
  "spacing": { "xs": "4px", "sm": "8px", "md": "16px" },
  "radius": { "sm": "4px", "md": "8px" },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.1)" },
  "a11y": { "buttonMinHeight": "44px", "requiredAria": true }
}
```

Restart the server — `get-theme("<name>")` will find it automatically.

---

## Component Registry

Components live in [src/registry/components.json](src/registry/components.json).

### Adding a component

```json
{
  "MyComponent": {
    "description": "Short description of what this component does",
    "props": {
      "variant": ["primary", "secondary"],
      "size": ["sm", "md", "lg"]
    },
    "examples": ["<MyComponent variant=\"primary\">Label</MyComponent>"],
    "tags": ["category", "use-case"]
  }
}
```

Restart the server — the component will be discoverable via `list-components` and `search-components`.

---

## Layout Patterns

Reusable page layouts are defined in [src/layouts/patterns.json](src/layouts/patterns.json). Supported categories: `dashboard`, `auth`, `form`, `settings`.

---

## Project Structure

```
src/
├── server.ts                      # Fastify server + MCP tool registration
├── tools/                         # One file per tool implementation
│   ├── getTheme.ts
│   ├── listComponents.ts
│   ├── getComponentDetails.ts
│   ├── searchComponents.ts
│   ├── getLayoutPatterns.ts
│   ├── validateDesign.ts
│   ├── validateAccessibility.ts
│   ├── getTailwindTheme.ts
│   ├── getComponentDeprecated.ts
│   └── listComponentStories.ts
├── loaders/                       # Data loading and parsing
│   ├── themeLoader.ts
│   ├── componentRegistryLoader.ts
│   ├── layoutPatternLoader.ts
│   ├── storybookLoader.ts
│   └── tailwindLoader.ts
├── schemas/                       # Zod schemas and TypeScript types
│   ├── component.schema.ts
│   ├── tailwindTheme.schema.ts
│   ├── validation.schema.ts
│   └── a11y.schema.ts
├── registry/
│   └── components.json            # Component metadata
└── utils/
    ├── configResolver.ts          # Safe Tailwind config parser (no eval)
    └── search.ts                  # Token-based component search

themes/                            # Theme token JSON files
src/layouts/
└── patterns.json                  # Layout pattern definitions
```

---

## Development

```bash
# Development (auto-reload via tsx)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

TypeScript is configured with `ES2022` target, `NodeNext` module resolution, and strict mode. Source lives in `src/`, compiled output in `dist/`.

---

## Response Format

Every tool and REST endpoint returns the same JSON envelope:

**Success**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "COMPONENT_NOT_FOUND",
    "message": "Component 'Foo' was not found."
  }
}
```

Common error codes: `THEME_NOT_FOUND`, `COMPONENT_NOT_FOUND`, `INVALID_REQUEST`, `LAYOUT_NOT_FOUND`, `TAILWIND_CONFIG_NOT_FOUND`.
