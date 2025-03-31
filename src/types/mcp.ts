
export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
}

export interface MCPResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface MCPConnectionStats {
  totalClients: number;
  connectedClients: number;
  lastConnectionAttempt: number;
}

export interface MCPServerInfo {
  id: string;
  url: string;
  name: string;
  isConnected: boolean;
  availableTools: MCPTool[];
}

export interface MCPContext {
  isConnected: boolean;
  connectionStatus: string;
  connectionStats: MCPConnectionStats;
  availableTools: MCPTool[];
  connectToMCP: (projectId: string) => Promise<boolean>;
  disconnectFromMCP: () => void;
  listAvailableTools: () => Promise<MCPTool[]>;
  callTool: (toolName: string, parameters: any) => Promise<MCPResponse>;
}

export interface MCPToolCallParams {
  toolName: string;
  parameters: any;
  projectId?: string;
}

export interface MCPListToolsParams {
  projectId?: string;
}
