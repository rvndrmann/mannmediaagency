# Playwright MCP Implementation Plan

1.  **Gather Information:**
    *   Read the existing MCP configuration to understand how other MCP servers are configured.
    *   Identify the file where MCP servers are configured.
    *   Check if there's existing browser-use related code.
2.  **Clarify Configuration Details:**
    *   Ask the user if they want to run the browser in headless mode or headed mode.
    *   Ask the user if they want to use snapshot mode or vision mode.
    *   Ask the user if they have a specific port they want to use.
3.  **Implement the Configuration:**
    *   Add the Playwright MCP configuration to the appropriate file.
4.  **Test the Configuration:**
    *   Provide instructions on how to test the Playwright MCP server.
5.  **Offer to Save the Plan:**
    *   Ask the user if they'd like to save the plan to a markdown file.
6.  **Switch to Code Mode:**
    *   Request to switch to Code mode to implement the solution.

## Configuration Details

The user has chosen to run the Playwright MCP server in headed mode with vision mode and the default port.

## Implementation Details

The following changes will be made to `src/contexts/MCPContext.tsx`:

*   Modify the `MCPContext` interface to include a `addMcpServer` function.
*   Modify the `MCPProvider` function to include the `addMcpServer` function, which will add the Playwright MCP server to the `mcpServers` state.
*   Add the Playwright MCP server configuration to the `useEffect` hook that attempts to connect to the MCP server.

## Diff

\`\`\`diff
<<<<<<< SEARCH
:start_line:17
:end_line:18
-------
  mcpServers: MCPServer[];
  
=======
  mcpServers: MCPServer[];
  addMcpServer: (server: MCPServer) => void;
>>>>>>> REPLACE

<<<<<<< SEARCH
:start_line:62
:end_line:63
-------
  setUseMcp: () => {},
  registerTool: () => {},
=======
  setUseMcp: () => { },
  registerTool: () => { },
>>>>>>> REPLACE

<<<<<<< SEARCH
:start_line:65
:end_line:66
-------
  connectionMetrics: defaultConnectionMetrics
};
=======
  connectionMetrics: defaultConnectionMetrics,
  addMcpServer: () => { }
};
>>>>>>> REPLACE

<<<<<<< SEARCH
:start_line:85
:end_line:86
-------
  const [useMcp, setUseMcp] = useState<boolean>(true); // Default to true for better compatibility
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [connectionStats, setConnectionStats] = useState<MCPConnectionStats>(defaultConnectionStats);
=======
  const [useMcp, setUseMcp] = useState<boolean>(true);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [connectionStats, setConnectionStats] = useState<MCPConnectionStats>(defaultConnectionStats);
>>>>>>> REPLACE

<<<<<<< SEARCH
:start_line:87
:end_line:96
-------
  const [connectionMetrics, setConnectionMetrics] = useState<MCPConnectionMetrics>(defaultConnectionMetrics);
  
  // Attempt to connect to MCP on component mount or when projectId changes
  useEffect(() => {
    if (projectId && useMcp && status === 'disconnected' && !isConnecting) {
      attemptConnection();
    }
    // We only want to attempt connection when these dependencies change
  }, [projectId, useMcp, status, isConnecting]);
=======
  const [connectionMetrics, setConnectionMetrics] = useState<MCPConnectionMetrics>(defaultConnectionMetrics);

  const addMcpServer = (server: MCPServer) => {
    setMcpServers(prev => {
      const existingServer = prev.find(s => s.name === server.name);
      if (existingServer) {
        return prev;
      }
      return [...prev, server];
    });
  };

  // Attempt to connect to MCP on component mount or when projectId changes
  useEffect(() => {
    if (projectId && useMcp && status === 'disconnected' && !isConnecting) {
      // Add Playwright MCP server
      addMcpServer({
        name: 'playwright',
        command: 'npx',
        args: ['@playwright/mcp@latest', '--vision'],
        isConnected: () => true, // Mock isConnected for now
        executeTool: async (toolName: string, params: any) => {
          console.log(`Executing Playwright MCP tool: ${toolName}`, params);
          // Simulate a delay
          await new Promise(resolve => setTimeout(resolve, 500));

          // Mock response
          return {
            success: true,
            result: {
              message: `Successfully called tool ${toolName} on Playwright MCP`,
              timestamp: new Date().toISOString()
            }
          };
        },
        listTools: async () => {
          return []; // Mock listTools for now
        }
      });
      attemptConnection();
    }
    // We only want to attempt connection when these dependencies change
  }, [projectId, useMcp, status, isConnecting, addMcpServer]);
>>>>>>> REPLACE

<<<<<<< SEARCH
:start_line:215
:end_line:216
-------
    mcpServers,
    useMcp,
=======
    mcpServers,
    addMcpServer,
    useMcp,
>>>>>>> REPLACE
\`\`\`