#!/usr/bin/env node

/**
 * @novaplan/mcp-server
 * MCP server for NovaPlan — connects AI coding agents to your projects.
 *
 * Usage:
 *   NOVAPLAN_API_KEY=novaplan_xxx npx @novaplan/mcp-server
 *
 * Claude Code config:
 *   { "mcpServers": { "novaplan": { "command": "npx", "args": ["@novaplan/mcp-server"], "env": { "NOVAPLAN_API_KEY": "..." } } } }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_TOOLS } from "./tools.js";

async function main() {
  const server = new McpServer({
    name: "novaplan",
    version: "1.0.0",
  });

  // Register all tools
  for (const tool of MCP_TOOLS) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: tool.inputSchema,
    }, tool.handler);
  }

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("NovaPlan MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
