import Fastify, { FastifyReply, FastifyRequest } from "fastify";
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
import { getComponentDeprecated } from "./tools/getComponentDeprecated.js";
import { listComponentStories } from "./tools/listComponentStories.js";
import { validateAccessibility } from "./tools/validateAccessibility.js";

const app = Fastify();

type GetThemeQuery = {
  theme?: string;
};

type GetComponentDetailsQuery = {
  name?: string;
};

type SearchComponentsQuery = {
  q?: string;
};

type GetLayoutPatternsQuery = {
  category?: string;
  q?: string;
};

type ValidateDesignBody = {
  components: string[];
  colors?: Record<string, string>;
  theme?: string;
};

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
              text: JSON.stringify({
                success: true,
                data: themeData,
              }),
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
      description: "List all available design-system components.",
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: listComponents(),
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get-component-details",
    {
      description: "Get full metadata for a design-system component.",
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
              data: {
                name: componentName,
                ...details,
              },
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
      inputSchema: {
        q: z.string().describe("Search query."),
      },
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
      description: "Retrieve reusable page layout templates.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Filter by layout category (dashboard, auth, form, settings)."),
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
            text: JSON.stringify({
              success: true,
              data: result,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "validate-design",
    {
      description: "Validate design components and colors against the design system.",
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
          .describe("Theme name to validate against (default, customer-a, customer-b)."),
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
            text: JSON.stringify({
              success: true,
              data: result,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get-tailwind-theme",
    {
      description: "Fetch Tailwind theme configuration (colors, spacing, breakpoints, etc.).",
    },
    async () => {
      try {
        const theme = getTailwindTheme();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                data: theme,
              }),
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
                  message: "tailwind.config.ts or tailwind.config.js not found.",
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
    "get-component-deprecated",
    {
      description: "List all deprecated components and their replacements.",
    },
    async () => {
      const deprecated = getComponentDeprecated();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: deprecated,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "list-component-stories",
    {
      description: "List all component stories discovered from Storybook files.",
    },
    async () => {
      try {
        const stories = await listComponentStories();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                data: stories,
              }),
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                data: {},
              }),
            },
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
      },
    },
    async ({ componentName, props }) => {
      try {
        const result = validateAccessibility({ componentName, props });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                data: result,
              }),
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
                  message: error instanceof Error ? error.message : "Invalid request.",
                },
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

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
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        }),
      );
    }

    console.error("Error handling MCP request:", error);
  } finally {
    await transport.close();
    await server.close();
  }
}

// MCP transport endpoints for VS Code and other Streamable HTTP clients
app.post("/", handleMcpRequest);
app.post("/mcp", handleMcpRequest);

// Backward-compatible REST endpoints
app.get<{ Querystring: GetThemeQuery }>(
  "/tools/get-theme",
  async (request, reply) => {
    const themeName = request.query.theme?.trim() || "default";

    try {
      const theme = getTheme(themeName);
      return {
        success: true,
        data: theme,
      };
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

app.get("/tools/list-components", async () => {
  return {
    success: true,
    data: listComponents(),
  };
});

app.get<{ Querystring: GetComponentDetailsQuery }>(
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

    return {
      success: true,
      data: {
        name: componentName,
        ...details,
      },
    };
  },
);

app.get<{ Querystring: SearchComponentsQuery }>(
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

    return {
      success: true,
      data: searchComponents(query),
    };
  },
);

app.get<{ Querystring: GetLayoutPatternsQuery }>(
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

    return {
      success: true,
      data: result,
    };
  },
);

app.post<{ Body: ValidateDesignBody }>(
  "/tools/validate-design",
  async (request, reply) => {
    try {
      const result = validateDesign(request.body);
      return {
        success: true,
        data: result,
      };
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
  },
);

app.get("/tools/get-tailwind-theme", async (_, reply) => {
  try {
    const theme = getTailwindTheme();
    return {
      success: true,
      data: theme,
    };
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

app.get("/tools/get-component-deprecated", async () => {
  const deprecated = getComponentDeprecated();
  return {
    success: true,
    data: deprecated,
  };
});

app.get("/tools/list-component-stories", async () => {
  try {
    const stories = await listComponentStories();
    return {
      success: true,
      data: stories,
    };
  } catch {
    return {
      success: true,
      data: {},
    };
  }
});

app.post<{ Body: { componentName: string; props?: Record<string, any> } }>(
  "/tools/validate-accessibility",
  async (request, reply) => {
    try {
      const result = validateAccessibility(request.body);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: error instanceof Error ? error.message : "Invalid request body.",
        },
      });
    }
  },
);

app.get("/health", async () => {
  return {
    success: true,
  };
});

await app
  .listen({
    port: 3000,
  })
  .then(() => {
    console.log("Design System MCP server is running on http://localhost:3000");
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
