import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:8081/canvas', // Replace with your Canvas page URL
    mcpServerName: 'my-mcp-server', // Replace with your MCP server name
  },
});