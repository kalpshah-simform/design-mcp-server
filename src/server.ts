import { readdirSync } from "node:fs";
import path from "node:path";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { getTheme } from "./tools/getTheme.js";
import { getComponentDetails } from "./tools/getComponentDetails.js";
import { listComponents } from "./tools/listComponents.js";
import { searchComponents } from "./tools/searchComponents.js";
import { getLayoutPatterns } from "./tools/getLayoutPatterns.js";
import { validateDesign } from "./tools/validateDesign.js";
import { getTailwindTheme } from "./tools/getTailwindTheme.js";
import { listComponentStories } from "./tools/listComponentStories.js";
import { validateAccessibility } from "./tools/validateAccessibility.js";
import { compareThemes } from "./tools/compareThemes.js";
import { getCssVariables } from "./tools/getCssVariables.js";
import { loadTheme, clearThemeCache } from "./loaders/themeLoader.js";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
  genReqId: (req) => {
    const header = req.headers["x-request-id"];
    return (
      (Array.isArray(header) ? header[0] : header) ??
      Math.random().toString(36).slice(2, 10)
    );
  },
});

// ---------------------------------------------------------------------------
// Rate limiting — defaults: 100 req/min per IP; override via env vars
// ---------------------------------------------------------------------------
await app.register(rateLimit, {
  max: Number.parseInt(process.env.RATE_LIMIT_MAX ?? "100"),
  timeWindow: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000"),
});

// ---------------------------------------------------------------------------
// Request timing — warn on slow responses (>2 s)
// ---------------------------------------------------------------------------
app.addHook("onResponse", (request, reply, done) => {
  const elapsed = reply.elapsedTime;
  if (elapsed > 2000) {
    request.log.warn(
      { elapsed, url: request.url, method: request.method },
      "slow request",
    );
  }
  done();
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type GetThemeQuery = { theme?: string };
type GetComponentDetailsQuery = { name?: string };
type SearchComponentsQuery = { q?: string };
type GetLayoutPatternsQuery = { category?: string; q?: string };
type ValidateDesignBody = {
  components: string[];
  colors?: Record<string, string>;
  theme?: string;
};

// ---------------------------------------------------------------------------
// MCP server factory
// ---------------------------------------------------------------------------
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "design-system",
    version: "1.0.0",
  });

  server.registerTool(
    "get-theme",
    {
      description: "Fetch design tokens for a given theme.",
      inputSchema: {
        theme: z
          .string()
          .optional()
          .describe("Theme name (default, customer-a, customer-b)."),
      },
    },
    async ({ theme }) => {
      const themeName = theme?.trim() || "default";
      try {
        const themeData = getTheme(themeName);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, data: themeData }),
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: {
                  code: "THEME_NOT_FOUND",
                  message: `Theme '${themeName}' was not found.`,
                },
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list-components",
    {
      description:
        "List all available design-system components. Each entry includes the component name, a deprecated flag, and (if deprecated) the recommended replacement.",
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, data: listComponents() }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get-component-details",
    {
      description:
        "Get full metadata for a design-system component, including props, examples, tags, and any deprecation information.",
      inputSchema: {
        name: z.string().describe("Exact component name."),
      },
    },
    async ({ name }) => {
      const componentName = name.trim();
      const details = getComponentDetails(componentName);

      if (!details) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: {
                  code: "COMPONENT_NOT_FOUND",
                  message: `Component '${componentName}' was not found.`,
                },
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: { name: componentName, ...details },
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "search-components",
    {
      description: "Search components by natural-language intent.",
      inputSchema: { q: z.string().describe("Search query.") },
    },
    async ({ q }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: searchComponents(q.trim()),
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get-layout-patterns",
    {
      description:
        "Retrieve reusable page layout templates, including responsive breakpoint guidance and mobile examples.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            "Filter by layout id (dashboard, auth, form, settings, mobile-list, mobile-tabs).",
          ),
        q: z
          .string()
          .optional()
          .describe("Search layouts by intent or keywords."),
      },
    },
    async ({ category, q }) => {
      const result = getLayoutPatterns({
        category: category?.trim(),
        q: q?.trim(),
      });

      if (result === null) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: {
                  code: "LAYOUT_NOT_FOUND",
                  message: `Layout category '${category}' was not found.`,
                },
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, data: result }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "validate-design",
    {
      description:
        "Validate design components and colors against the design system.",
      inputSchema: {
        components: z
          .array(z.string())
          .describe("List of component names to validate."),
        colors: z
          .record(z.string(), z.string())
          .optional()
          .describe("Color tokens to validate (key-value pairs)."),
        theme: z
          .string()
          .optional()
          .describe("Theme name to validate against."),
      },
    },
    async ({ components, colors, theme }) => {
      const result = validateDesign({
        components,
        colors,
        theme: theme?.trim(),
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, data: result }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get-tailwind-theme",
    {
      description:
        "Fetch Tailwind theme configuration (colors, spacing, breakpoints, etc.).",
    },
    async () => {
      try {
        const theme = getTailwindTheme();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, data: theme }),
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: {
                  code: "TAILWIND_CONFIG_NOT_FOUND",
                  message:
                    "tailwind.config.ts or tailwind.config.js not found.",
                },
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "list-component-stories",
    {
      description:
        "List all component stories discovered from Storybook files.",
    },
    async () => {
      try {
        const stories = await listComponentStories();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, data: stories }),
            },
          ],
        };
      } catch {
        return {
          content: [
            { type: "text", text: JSON.stringify({ success: true, data: {} }) },
          ],
        };
      }
    },
  );

  server.registerTool(
    "validate-accessibility",
    {
      description: "Validate a component for accessibility compliance.",
      inputSchema: {
        componentName: z.string().describe("Component name to validate."),
        props: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Component props for validation."),
        theme: z
          .string()
          .optional()
          .describe("Theme name to validate against."),
      },
    },
    async ({ componentName, props, theme }) => {
      try {
        const result = validateAccessibility({ componentName, props, theme });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, data: result }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: {
                  code: "INVALID_REQUEST",
                  message:
                    error instanceof Error ? error.message : "Invalid request.",
                },
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "compare-themes",
    {
      description:
        "Compare two themes and return a token-level diff organized by category (colors, typography, spacing, radius, shadows, a11y). Useful when generating multi-tenant or white-label UI code.",
      inputSchema: {
        themeA: z.string().describe("First theme name (e.g. default)."),
        themeB: z
          .string()
          .describe("Second theme name to compare against (e.g. customer-a)."),
      },
    },
    async ({ themeA, themeB }) => {
      try {
        const result = compareThemes(themeA.trim(), themeB.trim());
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, data: result }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: {
                  code: "THEME_NOT_FOUND",
                  message:
                    error instanceof Error ? error.message : "Theme not found.",
                },
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get-css-variables",
    {
      description:
        "Return all CSS custom properties (--variable: value) discovered in the project's CSS files, grouped both as a flat map and by selector (:root, .dark, [data-theme], etc.). Use this to understand the token layer beneath Tailwind or to resolve var(--x) references.",
    },
    async () => {
      const result = getCssVariables();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, data: result }),
          },
        ],
      };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// MCP request handler
// ---------------------------------------------------------------------------
async function handleMcpRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  reply.hijack();

  try {
    request.raw.headers.accept = "application/json, text/event-stream";
    await server.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  } catch (error) {
    if (!reply.raw.headersSent) {
      reply.raw.statusCode = 500;
      reply.raw.setHeader("content-type", "application/json");
      reply.raw.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        }),
      );
    }
    app.log.error({ err: error }, "Error handling MCP request");
  } finally {
    await transport.close();
    await server.close();
  }
}

// ---------------------------------------------------------------------------
// MCP transport endpoints
// ---------------------------------------------------------------------------
app.post("/", handleMcpRequest);
app.post("/mcp", handleMcpRequest);

// ---------------------------------------------------------------------------
// Versioned REST endpoints (/v1/tools/...)
// ---------------------------------------------------------------------------
await app.register(
  async (v1) => {
    v1.get<{ Querystring: GetThemeQuery }>(
      "/tools/get-theme",
      async (request, reply) => {
        const themeName = request.query.theme?.trim() || "default";
        try {
          return { success: true, data: getTheme(themeName) };
        } catch {
          return reply.code(404).send({
            success: false,
            error: {
              code: "THEME_NOT_FOUND",
              message: `Theme '${themeName}' was not found.`,
            },
          });
        }
      },
    );

    v1.get("/tools/list-components", async () => {
      return { success: true, data: listComponents() };
    });

    v1.get<{ Querystring: GetComponentDetailsQuery }>(
      "/tools/get-component-details",
      async (request, reply) => {
        const componentName = request.query.name?.trim();
        if (!componentName) {
          return reply.code(400).send({
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Query parameter 'name' is required.",
            },
          });
        }
        const details = getComponentDetails(componentName);
        if (!details) {
          return reply.code(404).send({
            success: false,
            error: {
              code: "COMPONENT_NOT_FOUND",
              message: `Component '${componentName}' was not found.`,
            },
          });
        }
        return { success: true, data: { name: componentName, ...details } };
      },
    );

    v1.get<{ Querystring: SearchComponentsQuery }>(
      "/tools/search-components",
      async (request, reply) => {
        const query = request.query.q?.trim();
        if (!query) {
          return reply.code(400).send({
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "Query parameter 'q' is required.",
            },
          });
        }
        return { success: true, data: searchComponents(query) };
      },
    );

    v1.get<{ Querystring: GetLayoutPatternsQuery }>(
      "/tools/get-layout-patterns",
      async (request, reply) => {
        const result = getLayoutPatterns({
          category: request.query.category?.trim(),
          q: request.query.q?.trim(),
        });
        if (result === null) {
          return reply.code(404).send({
            success: false,
            error: {
              code: "LAYOUT_NOT_FOUND",
              message: `Layout category '${request.query.category}' was not found.`,
            },
          });
        }
        return { success: true, data: result };
      },
    );

    v1.post<{ Body: ValidateDesignBody }>(
      "/tools/validate-design",
      async (request, reply) => {
        try {
          return { success: true, data: validateDesign(request.body) };
        } catch (error) {
          return reply.code(400).send({
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message:
                error instanceof Error
                  ? error.message
                  : "Invalid request body.",
            },
          });
        }
      },
    );

    v1.get("/tools/get-tailwind-theme", async (_, reply) => {
      try {
        return { success: true, data: getTailwindTheme() };
      } catch {
        return reply.code(404).send({
          success: false,
          error: {
            code: "TAILWIND_CONFIG_NOT_FOUND",
            message: "tailwind.config.ts or tailwind.config.js not found.",
          },
        });
      }
    });

    v1.get("/tools/list-component-stories", async () => {
      try {
        return { success: true, data: await listComponentStories() };
      } catch {
        return { success: true, data: {} };
      }
    });

    v1.post<{
      Body: {
        componentName: string;
        props?: Record<string, unknown>;
        theme?: string;
      };
    }>("/tools/validate-accessibility", async (request, reply) => {
      try {
        return { success: true, data: validateAccessibility(request.body) };
      } catch (error) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message:
              error instanceof Error ? error.message : "Invalid request body.",
          },
        });
      }
    });

    v1.get<{ Querystring: { a?: string; b?: string } }>(
      "/tools/compare-themes",
      async (request, reply) => {
        const themeA = request.query.a?.trim();
        const themeB = request.query.b?.trim();
        if (!themeA || !themeB) {
          return reply.code(400).send({
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message:
                "Query parameters 'a' and 'b' (theme names) are required.",
            },
          });
        }
        try {
          return { success: true, data: compareThemes(themeA, themeB) };
        } catch (error) {
          return reply.code(404).send({
            success: false,
            error: {
              code: "THEME_NOT_FOUND",
              message:
                error instanceof Error ? error.message : "Theme not found.",
            },
          });
        }
      },
    );

    v1.get("/tools/get-css-variables", async () => {
      return { success: true, data: getCssVariables() };
    });
  },
  { prefix: "/v1" },
);

// ---------------------------------------------------------------------------
// Health check (unversioned — monitoring tools expect a stable URL)
// ---------------------------------------------------------------------------
app.get("/health", async () => ({ success: true }));

// ---------------------------------------------------------------------------
// Startup: validate all theme files before accepting requests
// ---------------------------------------------------------------------------
function validateStartupThemes(): void {
  const themesDir = path.join(process.cwd(), "themes");
  let files: string[];

  try {
    files = readdirSync(themesDir).filter((f) => f.endsWith(".json"));
  } catch {
    app.log.error({ themesDir }, "STARTUP ERROR: Cannot read themes directory");
    process.exit(1);
  }

  if (files.length === 0) {
    app.log.error(
      { themesDir },
      "STARTUP ERROR: No theme files found in themes directory",
    );
    process.exit(1);
  }

  const errors: string[] = [];
  // Clear cache so we get a fresh validated load for each theme
  clearThemeCache();

  for (const file of files) {
    const themeName = file.replace(".json", "");
    try {
      loadTheme(themeName);
    } catch (err) {
      errors.push(
        `  - ${file}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (errors.length > 0) {
    app.log.error(
      { errors },
      "STARTUP ERROR: One or more theme files are invalid",
    );
    process.exit(1);
  }

  app.log.info(
    { count: files.length, files },
    "Startup theme validation passed",
  );
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
validateStartupThemes();

await app
  .listen({ port: 3000 })
  .then(() => {
    app.log.info(
      "Design System MCP server is running on http://localhost:3000",
    );
  })
  .catch((err) => {
    app.log.error({ err }, "Failed to start server");
    process.exit(1);
  });
