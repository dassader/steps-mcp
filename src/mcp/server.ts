import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { SqliteDatabase } from "../db/connection.js";
import { readDocumentationResource } from "../resources/documentation.js";

export interface McpServerContext {
  db: SqliteDatabase;
}

export function createMcpServer(context: McpServerContext): McpServer {
  const server = new McpServer(
    {
      name: "steps-mcp",
      title: "Steps MCP",
      version: "0.1.0"
    },
    {
      instructions:
        "Start by reading steps://docs/overview. For new work, use the prompt plan.break_down to create a reviewable plan with detailed steps."
    }
  );

  server.registerResource(
    "docs.overview",
    "steps://docs/overview",
    {
      title: "Steps MCP Overview",
      description: "Overview and getting-started guide for Steps MCP.",
      mimeType: "text/markdown"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: readDocumentationResource("steps://docs/overview")?.text ?? "# Steps MCP Overview\n\nDocumentation is unavailable."
        }
      ]
    })
  );

  server.registerPrompt(
    "plan.break_down",
    {
      title: "Break Down Work",
      description: "Self-contained guide for turning a user goal into a reviewable plan with detailed steps.",
      argsSchema: {
        goal: z.string().min(1).describe("The user goal or work item to break down."),
        constraints: z.string().optional().describe("Optional constraints, context, or preferences.")
      }
    },
    ({ goal, constraints }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Break down this work into a Steps MCP plan: ${goal}`,
              constraints ? `Constraints: ${constraints}` : undefined,
              "",
              "Create a reviewable plan with detailed markdown steps. Each step should explain what to do, why it matters, expected result, constraints, and how to verify it.",
              "After creating the plan, show the returned review URL to the user and wait for explicit approval before execution."
            ]
              .filter(Boolean)
              .join("\n")
          }
        }
      ]
    })
  );

  server.registerTool(
    "server.ping",
    {
      title: "Ping Server",
      description: "Return a small success response proving the MCP server is reachable.",
      inputSchema: {},
      outputSchema: {
        ok: z.literal(true),
        message: z.string(),
        database: z.object({
          memory: z.boolean()
        })
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async () => ({
      content: [
        {
          type: "text",
          text: "Steps MCP server is reachable."
        }
      ],
      structuredContent: {
        ok: true,
        message: "Steps MCP server is reachable.",
        database: {
          memory: context.db.memory
        }
      }
    })
  );

  return server;
}
