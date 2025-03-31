
// MCP Types
export interface MCPServer {
  id: string;
  url: string;
  updateInterval: number;
  isConnected: () => boolean;
  listTools?: () => Promise<MCPToolDefinition[]>;
  executeTool?: (toolName: string, parameters: any) => Promise<MCPToolExecutionResult>;
}

export interface MCPConnectionMetrics {
  successCount: number;
  failureCount: number;
  averageConnectTime: number;
  lastAttemptTime?: number;
}

export interface MCPConnectionStats {
  totalClients: number;
  connectedClients: number;
  lastConnectionAttempt: number;
}

export interface MCPContext {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionStats: MCPConnectionStats;
  availableTools: MCPTool[];
  connectToMCP: (projectId: string) => Promise<boolean>;
  disconnectFromMCP: () => void;
  listAvailableTools: () => Promise<MCPTool[]>;
  callTool: (toolName: string, parameters: any) => Promise<MCPResponse>;
  mcpServers?: MCPServer[]; // Add missing properties
  useMcp?: boolean;
  setUseMcp?: (useMcp: boolean) => void;
  isConnecting?: boolean;
  hasConnectionError?: boolean;
  reconnectToMcp?: () => Promise<boolean>;
  lastReconnectAttempt?: number;
  connectionMetrics?: MCPConnectionMetrics;
}

export interface MCPProviderProps {
  children: React.ReactNode;
  projectId?: string;
}

export const CONNECTION_CONFIG = {
  minReconnectInterval: 5000,
  maxRetries: 3,
  connectionTimeout: 10000
};

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

export interface MCPToolCallParams {
  toolName: string;
  parameters: any;
  projectId?: string;
}

export interface MCPListToolsParams {
  projectId?: string;
}

export interface MCPToolExecutionResult {
  success: boolean;
  result?: string;
  data?: any;
  error?: string;
  [key: string]: any;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}
