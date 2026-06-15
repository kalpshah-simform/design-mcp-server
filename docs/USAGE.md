# Design System MCP Server — Usage Guide

## Overview

This server exposes your design system to AI tools via HTTP.
Use it as a skill or context source in GitHub Copilot, Cursor, Claude Desktop, or any MCP client.

The server runs on `http://localhost:3000`.

This project now exposes a proper MCP Streamable HTTP server endpoint at:

- `POST /`
- `POST /mcp`

For MCP clients, use one of those URLs as the MCP endpoint.

---

## Tool Capabilities Overview

### Phase 1: Component & Token Discovery (MVP)

**Tools 1-4** provide the foundation for AI-aware code generation:

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `get-theme` | Fetch design tokens | Theme name | Colors, typography, spacing, shadows, a11y rules |
| `list-components` | Discover available UI components | None | Component names |
| `get-component-details` | Get component metadata | Component name | Props, variants, examples, tags |
| `search-components` | Find components by intent | Natural language query | Matching component names (scored) |

**Use Phase 1 for**: Building individual components, form fields, buttons, cards, modals, etc.

### Phase 2: Layout Scaffolding & Validation (Extended)

**Tools 5-6** enable full-page generation and design system compliance:

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `get-layout-patterns` | Retrieve page layout templates | Category or search query | Layout patterns with slots and suggested components |
| `validate-design` | Validate components & colors | Component list + color tokens | Structured validation findings (pass/fail per item) |

**Use Phase 2 for**: Generating complete page layouts, ensuring design compliance, scaffolding dashboard structures, validating generated code against design system.

### Phase 3: Enhanced Discovery, Deprecation & Accessibility (Enhanced)

**Tools 7-10** integrate live project artifacts and validation:

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `get-tailwind-theme` | Fetch Tailwind config values | None | Colors, spacing, breakpoints, border-radius, shadows |
| `list-component-stories` | Discover Storybook component examples | None | Component stories grouped by name with examples |
| `get-component-deprecated` | List deprecated components | None | Deprecated components with replacements & migration notes |
| `validate-accessibility` | Validate WCAG compliance | Component name + props | Accessibility findings (button height, ARIA, color contrast) |

**Use Phase 3 for**: Avoiding deprecated components, validating Tailwind usage, discovering component examples from Storybook, ensuring accessibility compliance in generated code.

---

## VS Code MCP Client Configuration

Use this in your MCP client config:

```json
{
  "servers": {
    "design-system": {
      "type": "streamable-http",
      "url": "http://localhost:3000"
    }
  }
}
```

Alternative:

```json
{
  "servers": {
    "design-system": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

If you still see old logs like `Route POST:/ not found`, restart the server process so the latest code is running.

---

## How to Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

---

## Available Tools (Endpoints)

All endpoints return JSON with this envelope:

```json
{ "success": true, "data": ... }
```

Errors return:

```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

### 1. `GET /tools/get-theme`

Fetch design tokens for a theme: colors, typography, spacing, radius, shadows, and accessibility rules.

**Query parameters**

| Parameter | Required | Default   | Description                              |
|-----------|----------|-----------|------------------------------------------|
| `theme`   | No       | `default` | Theme name. Options: `default`, `customer-a`, `customer-b` |

**Example request**

```
GET /tools/get-theme?theme=default
```

**Example response**

```json
{
  "success": true,
  "data": {
    "name": "default",
    "colors": {
      "primary": "#0052CC",
      "secondary": "#172B4D",
      "gray-600": "#61646C",
      "surface": "#FFFFFF",
      "background": "#F7F8FA"
    },
    "typography": {
      "fontFamily": "Inter",
      "fontSize": { "sm": "12px", "md": "14px", "lg": "16px", "xl": "20px" }
    },
    "spacing": { "xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px" },
    "radius": { "sm": "4px", "md": "8px", "lg": "12px" },
    "shadows": {
      "sm": "0 1px 2px rgba(9, 30, 66, 0.16)",
      "md": "0 4px 8px rgba(9, 30, 66, 0.24)"
    },
    "a11y": { "buttonMinHeight": "44px", "requiredAria": true }
  }
}
```

**Error codes**

| Code              | HTTP | When                            |
|-------------------|------|---------------------------------|
| `THEME_NOT_FOUND` | 404  | Theme name does not exist       |

---

### 2. `GET /tools/list-components`

Returns the names of all available components in the design system.

**Query parameters** — none

**Example request**

```
GET /tools/list-components
```

**Example response**

```json
{
  "success": true,
  "data": ["Button", "Input", "Card", "Modal", "DataTable"]
}
```

---

### 3. `GET /tools/get-component-details`

Returns full metadata for a single component: description, props, examples, and tags.

**Query parameters**

| Parameter | Required | Description                  |
|-----------|----------|------------------------------|
| `name`    | Yes      | Exact component name, e.g. `Button` |

**Example request**

```
GET /tools/get-component-details?name=Button
```

**Example response**

```json
{
  "success": true,
  "data": {
    "name": "Button",
    "description": "Primary action button",
    "props": {
      "variant": ["primary", "secondary"],
      "size": ["sm", "md", "lg"]
    },
    "examples": ["<Button variant='primary'>Save</Button>"],
    "tags": ["actions", "forms", "cta"]
  }
}
```

**Error codes**

| Code                  | HTTP | When                            |
|-----------------------|------|---------------------------------|
| `INVALID_REQUEST`     | 400  | `name` parameter is missing     |
| `COMPONENT_NOT_FOUND` | 404  | Component name does not exist   |

---

### 4. `GET /tools/search-components`

Search for components by intent using natural language. Matches against component name, description, and tags.

**Query parameters**

| Parameter | Required | Description                              |
|-----------|----------|------------------------------------------|
| `q`       | Yes      | Search query, e.g. `table pagination`    |

Returns component names ordered by relevance score (most relevant first).

**Example request**

```
GET /tools/search-components?q=table%20pagination
```

**Example response**

```json
{
  "success": true,
  "data": ["DataTable"]
}
```

**More search examples**

| Query                   | Likely results                    |
|-------------------------|-----------------------------------|
| `form input`            | Input, Button                     |
| `overlay confirmation`  | Modal                             |
| `dashboard container`   | Card, DataTable                   |
| `cta button`            | Button                            |

**Error codes**

| Code              | HTTP | When                        |
|-------------------|------|-----------------------------|
| `INVALID_REQUEST` | 400  | `q` parameter is missing    |

---

### 5. `GET /tools/get-layout-patterns`

Retrieve reusable page layout templates with slot definitions and suggested components. Enables one-call page scaffolding.

**Query parameters**

| Parameter  | Required | Description                                          |
|------------|----------|------------------------------------------------------|
| `category` | No       | Filter by layout category: `dashboard`, `auth`, `form`, `settings` |
| `q`        | No       | Search layouts by intent or keywords                 |

Returns full layout pattern objects with id, name, description, tags, slots, and JSX examples.

**Example request — Get all patterns**

```
GET /tools/get-layout-patterns
```

**Example request — Filter by category**

```
GET /tools/get-layout-patterns?category=dashboard
```

**Example request — Search by intent**

```
GET /tools/get-layout-patterns?q=authentication+login
```

**Example response**

```json
{
  "success": true,
  "data": [
    {
      "id": "dashboard",
      "name": "Dashboard Layout",
      "description": "Multi-section dashboard with sidebar navigation and main content area for data visualization and overview cards.",
      "tags": ["admin", "data", "overview", "cards", "navigation"],
      "slots": {
        "header": {
          "description": "Top navigation bar with branding and user profile",
          "suggestedComponents": ["Button", "Input", "Card"]
        },
        "sidebar": {
          "description": "Left sidebar with navigation menu and filters",
          "suggestedComponents": ["Button", "Card"]
        },
        "main": {
          "description": "Central content area with data cards and visualizations",
          "suggestedComponents": ["Card", "DataTable", "Button"]
        },
        "footer": {
          "description": "Bottom footer with pagination or additional controls",
          "suggestedComponents": ["Button", "Card"]
        }
      },
      "example": "<div className='flex h-screen'>...</div>"
    }
  ]
}
```

**Available layouts**

| ID          | Name                  | Description                                      | Tags                                    |
|-------------|-----------------------|--------------------------------------------------|-----------------------------------------|
| `dashboard` | Dashboard Layout      | Sidebar + main content with card grid            | admin, data, overview, cards, navigation |
| `auth`      | Authentication Layout | Centered card layout for login/register          | auth, login, register, forms, public    |
| `form`      | Form Layout           | Two-column label+field layout with action bar    | form, settings, data-entry, fields      |
| `settings`  | Settings Layout       | Sidebar navigation with settings categories      | settings, account, preferences, nav     |

**Error codes**

| Code              | HTTP | When                            |
|-------------------|------|---------------------------------|
| `LAYOUT_NOT_FOUND` | 404  | Category does not exist         |

---

### 6. `POST /tools/validate-design`

Validate design components and color tokens against the design system. Returns structured validation findings.

**Request body**

```json
{
  "components": ["Button", "Input"],
  "colors": { "primary": "#0052CC" },
  "theme": "default"
}
```

| Field       | Type                      | Required | Description                                    |
|-------------|---------------------------|----------|------------------------------------------------|
| `components` | string[]                 | Yes      | List of component names to validate (min 1)   |
| `colors`    | Record<string, string>   | No       | Color tokens to validate (key-value pairs)    |
| `theme`     | string                   | No       | Theme name to validate against (default: `default`) |

**Example request**

```bash
curl -X POST http://localhost:3000/tools/validate-design \
  -H "Content-Type: application/json" \
  -d '{
    "components": ["Button", "Input"],
    "colors": {"primary": "#0052CC"},
    "theme": "default"
  }'
```

**Example response (valid)**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "findings": [
      {
        "field": "components[0]",
        "value": "Button",
        "valid": true,
        "code": "COMPONENT_VALID",
        "message": "Component 'Button' found."
      },
      {
        "field": "components[1]",
        "value": "Input",
        "valid": true,
        "code": "COMPONENT_VALID",
        "message": "Component 'Input' found."
      },
      {
        "field": "colors.primary",
        "value": "#0052CC",
        "valid": true,
        "code": "COLOR_VALID",
        "message": "Color token '#0052CC' is valid."
      }
    ]
  }
}
```

**Example response (invalid)**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "findings": [
      {
        "field": "components[1]",
        "value": "GhostWidget",
        "valid": false,
        "code": "UNKNOWN_COMPONENT",
        "message": "Component 'GhostWidget' was not found."
      },
      {
        "field": "colors.primary",
        "value": "#FF0000",
        "valid": false,
        "code": "INVALID_COLOR_TOKEN",
        "message": "Color token '#FF0000' was not found in theme."
      }
    ]
  }
}
```

**Validation codes**

| Code                 | When                                           |
|----------------------|------------------------------------------------|
| `COMPONENT_VALID`    | Component exists in design system              |
| `UNKNOWN_COMPONENT`  | Component does not exist                       |
| `COLOR_VALID`        | Color token exists in the selected theme       |
| `INVALID_COLOR_TOKEN`| Color token does not exist in theme            |
| `THEME_NOT_FOUND`    | Selected theme does not exist                  |

**Error codes (HTTP)**

| Code              | HTTP | When                                |
|-------------------|------|-------------------------------------|
| `INVALID_REQUEST` | 400  | Request body is invalid (missing `components`, invalid JSON, etc.) |

**Note**: Validation findings are returned as `data`, not as errors. Always check the `valid` field in the response — when `valid: false`, some components or colors did not validate, but the API call itself succeeded.

---

### 7. `GET /tools/get-tailwind-theme`

Fetch the Tailwind configuration values directly from your project's `tailwind.config.ts` or `tailwind.config.js`. Enables AI to validate Tailwind class names and values against your actual configuration.

**Query parameters** — none

**Example request**

```
GET /tools/get-tailwind-theme
```

**Example response**

```json
{
  "success": true,
  "data": {
    "colors": {
      "primary": "#0052CC",
      "secondary": "#172B4D",
      "gray-100": "#F7F8FA",
      "gray-600": "#61646C",
      "error": "#AE2A19"
    },
    "spacing": {
      "xs": "4px",
      "sm": "8px",
      "md": "16px",
      "lg": "24px",
      "xl": "32px"
    },
    "breakpoints": {
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px"
    },
    "borderRadius": {
      "none": "0",
      "sm": "4px",
      "md": "8px",
      "lg": "12px",
      "full": "9999px"
    },
    "boxShadow": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px rgba(0,0,0,0.07)",
      "lg": "0 10px 15px rgba(0,0,0,0.1)"
    }
  }
}
```

**Error codes**

| Code                    | HTTP | When                            |
|-------------------------|------|---------------------------------|
| `TAILWIND_CONFIG_NOT_FOUND` | 404  | No `tailwind.config.ts` or `.js` found in project root |

---

### 8. `GET /tools/list-component-stories`

Discover all Storybook stories from your project's `.stories.tsx` files. Learn component variants and real usage examples directly from your Storybook.

**Query parameters** — none

**Example request**

```
GET /tools/list-component-stories
```

**Example response**

```json
{
  "success": true,
  "data": {
    "Button": {
      "stories": [
        {
          "name": "Primary",
          "example": "<Component name=\"Primary\" />"
        },
        {
          "name": "Secondary",
          "example": "<Component name=\"Secondary\" />"
        },
        {
          "name": "Disabled",
          "example": "<Component name=\"Disabled\" />"
        }
      ]
    },
    "Input": {
      "stories": [
        {
          "name": "Text",
          "example": "<Component name=\"Text\" />"
        },
        {
          "name": "Email",
          "example": "<Component name=\"Email\" />"
        },
        {
          "name": "Password",
          "example": "<Component name=\"Password\" />"
        }
      ]
    }
  }
}
```

**Note**: Returns empty object `{}` if no stories are found — no error status.

---

### 9. `GET /tools/get-component-deprecated`

List all deprecated components in your design system with migration guidance. Helps AI avoid using outdated components and suggests replacements.

**Query parameters** — none

**Example request**

```
GET /tools/get-component-deprecated
```

**Example response**

```json
{
  "success": true,
  "data": [
    {
      "name": "ButtonLegacy",
      "reason": "Deprecated in version 2.0.0",
      "replacement": "Button",
      "migrationNotes": "ButtonLegacy was renamed to Button in v2.0.0. Update all imports from ButtonLegacy to Button and use the new 'variant' prop instead of 'type' prop."
    }
  ]
}
```

**Note**: Returns empty array `[]` if no deprecated components exist.

---

### 10. `POST /tools/validate-accessibility`

Validate a component for accessibility (WCAG) compliance. Checks button touch target sizes, required ARIA attributes, and color contrast.

**Request body**

```json
{
  "componentName": "Button",
  "props": {
    "aria-label": "Save changes",
    "color": "#0052CC",
    "backgroundColor": "#FFFFFF"
  }
}
```

| Field             | Type                    | Required | Description                        |
|-------------------|-------------------------|----------|------------------------------------|
| `componentName`   | string                  | Yes      | Name of component to validate      |
| `props`           | Record<string, any>     | No       | Component props for validation     |

**Example request**

```bash
curl -X POST http://localhost:3000/tools/validate-accessibility \
  -H "Content-Type: application/json" \
  -d '{
    "componentName": "Button",
    "props": {"aria-label": "Click me"}
  }'
```

**Example response (valid)**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "findings": [
      {
        "field": "a11y.buttonMinHeight",
        "valid": true,
        "code": "A11Y_BUTTON_HEIGHT_VALID",
        "message": "Button meets minimum touch target size (44px)."
      },
      {
        "field": "a11y.ariaLabel",
        "valid": true,
        "code": "A11Y_ARIA_VALID",
        "message": "Component has ARIA label."
      }
    ]
  }
}
```

**Example response (invalid)**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "findings": [
      {
        "field": "componentName",
        "valid": false,
        "code": "COMPONENT_NOT_FOUND",
        "message": "Component 'InvalidComponent' not found."
      }
    ]
  }
}
```

**Validation rules**

| Rule | Check | When Valid |
|------|-------|-----------|
| Button min-height | Interactive components (Button, Input, Link, Checkbox, Radio) | Theme defines `a11y.buttonMinHeight: "44px"` |
| ARIA attributes | Component has `aria-label` or `ariaLabel` prop | Theme has `a11y.requiredAria: true` AND prop is present |
| Color contrast | Colors exist in design system theme | Both `color` and `backgroundColor` are valid theme tokens |

**Validation codes**

| Code                       | When                                           |
|----------------------------|------------------------------------------------|
| `COMPONENT_NOT_FOUND`      | Component does not exist in design system      |
| `A11Y_BUTTON_HEIGHT_VALID` | Interactive component meets min-height rule    |
| `A11Y_BUTTON_HEIGHT_INVALID` | Interactive component fails min-height rule  |
| `A11Y_ARIA_VALID`          | ARIA label is present                          |
| `A11Y_ARIA_MISSING`        | ARIA label is missing                          |
| `A11Y_CONTRAST_VALID`      | Colors are from design system                  |
| `A11Y_CONTRAST_INVALID`    | Colors are not from design system              |

**Error codes (HTTP)**

| Code              | HTTP | When                                |
|-------------------|------|-------------------------------------|
| `INVALID_REQUEST` | 400  | Request body is invalid             |

---

## Available Components

| Name        | Description                                   | Tags                               | Status |
|-------------|-----------------------------------------------|------------------------------------|--------|
| `Button`    | Primary action button                         | actions, forms, cta                | ✅ Active |
| `Input`     | Text input field for forms                    | forms, fields, data-entry          | ✅ Active |
| `Card`      | Content container with optional header/footer | layout, container, dashboard       | ✅ Active |
| `Modal`     | Overlay dialog for focused tasks              | overlay, dialog, confirmation      | ✅ Active |
| `DataTable` | Tabular data view with sorting and pagination | table, pagination, admin, reporting| ✅ Active |
| `ButtonLegacy` | Legacy button component _(use Button instead)_ | actions, deprecated | ⚠️ Deprecated in v2.0.0 |

**Note on deprecated components**: `ButtonLegacy` is deprecated. Use `get-component-deprecated` to discover all deprecated components and their recommended replacements. Always check this endpoint before using a component.

---

## Available Themes

| Theme Name   | Primary Color | Description              |
|--------------|---------------|--------------------------|
| `default`    | `#0052CC`     | Default blue brand theme |
| `customer-a` | `#0A7A5D`     | Green white-label theme  |
| `customer-b` | `#BF4B00`     | Orange white-label theme |

---

## Recommended AI Workflow

### For Component-Level UI Generation

When asked to generate individual components or sections:

1. `GET /tools/get-theme` — load colors, spacing, typography
2. `GET /tools/list-components` — discover available components
3. `GET /tools/get-component-deprecated` — check for deprecated components to avoid
4. `GET /tools/search-components?q=<intent>` — find relevant components
5. `GET /tools/get-component-details?name=<name>` — get props and examples for each component
6. _(Optional)_ `GET /tools/list-component-stories` — discover real component variants from Storybook
7. Generate JSX/HTML/code using only tokens and components from above
8. _(Optional)_ `POST /tools/validate-accessibility` — validate component accessibility

### For Full-Page Scaffolding

When asked to generate entire page layouts:

1. `GET /tools/get-layout-patterns?q=<intent>` — find matching layout templates
2. `GET /tools/get-layout-patterns?category=<category>` — or filter by specific category if known
3. Review the layout's slots and `suggestedComponents`
4. For each slot, call `GET /tools/get-component-details?name=<name>` to get component props
5. `GET /tools/get-theme` — load colors, spacing, typography for the entire layout
6. `GET /tools/get-component-deprecated` — verify components are not deprecated
7. Generate the page using the layout structure, suggested components, and design tokens

### For Design Validation

When AI code generation is complete and needs validation:

1. `POST /tools/validate-design` — submit generated component names and color values
2. Review the `findings` array for any `valid: false` entries
3. If invalid components or colors are found, regenerate using only valid alternatives

### For Tailwind Integration

When generating Tailwind CSS or utility classes:

1. `GET /tools/get-tailwind-theme` — fetch your actual Tailwind configuration
2. Use only color, spacing, breakpoint, and radius values from the response
3. Never hardcode values — always reference the Tailwind theme configuration

### For Accessibility Compliance

When creating interactive components:

1. `GET /tools/get-theme` — load accessibility rules (button min-height, required ARIA)
2. For each interactive component, call `POST /tools/validate-accessibility`
3. Review findings for any `valid: false` entries
4. Regenerate with proper ARIA attributes and correct sizing
5. Ensure all colors come from the theme (automatic contrast validation)

---

## Rules for AI Code Generation

### Component & Token Rules (Phase 1)

- Always use color tokens from `get-theme`. Never hardcode hex values.
- Always use spacing tokens from `get-theme`. Never hardcode px values.
- Only use components returned by `list-components`. Do not invent new component names.
- Use the `examples` field from `get-component-details` as the reference for correct JSX syntax.
- Respect `a11y.buttonMinHeight` (44px) for all interactive elements.
- When `a11y.requiredAria` is `true`, all interactive components must include appropriate ARIA attributes.

### Layout Rules (Phase 2)

- When generating full pages, first call `get-layout-patterns` to find applicable layout templates.
- Respect the layout's `slots` structure — use the `suggestedComponents` list for each slot.
- Only place components in their intended slots; do not create custom slot arrangements.
- Use the layout's `example` field as a reference for structure and styling approach.

### Validation Rules (Phase 2)

- After generating UI code, always call `validate-design` with the components and colors used.
- If any findings return `valid: false`, regenerate only using components and colors that validate.
- Iteratively call `validate-design` until all findings are valid (designing against the live design system, not assumptions).

### Deprecation Rules (Phase 3)

- Before using any component, check `get-component-deprecated` to ensure the component is not deprecated.
- When a deprecated component is found, always use the `replacement` component instead.
- Follow the `migrationNotes` for guidance on prop changes and other migration requirements.
- Never suggest deprecated components to users; always recommend the replacement component.

### Tailwind Integration Rules (Phase 3)

- Call `get-tailwind-theme` to fetch the actual Tailwind configuration values.
- Only use color names, spacing values, breakpoints, and border-radius values from the Tailwind response.
- Never hardcode color hex values, spacing px values, or breakpoint pixel values.
- Reference the theme in generated code comments when using custom Tailwind classes.

### Accessibility Rules (Phase 3)

- For each interactive component, call `validate-accessibility` with the component name and props.
- Ensure all components pass accessibility validation before suggesting them to users.
- Always include required ARIA attributes (e.g., `aria-label`, `aria-describedby`) when `a11y.requiredAria` is true.
- When color/background props are used, ensure both colors exist in the theme.
- Treat `valid: false` findings as errors and regenerate until all findings pass.

---

## Health Check

```
GET /health
```

Response:

```json
{ "success": true }
```
