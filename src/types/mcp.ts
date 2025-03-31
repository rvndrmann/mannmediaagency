
export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (enabled: boolean) => void;
  isConnecting: boolean;
  hasConnectionError: boolean;
  reconnectToMcp: () => Promise<boolean>;
  lastReconnectAttempt: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionMetrics: {
    successCount: number;
    failureCount: number;
    averageConnectTime: number;
  };
}

export interface MCPToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  response_schema?: Record<string, any>;
}

export interface MCPToolExecutionParams {
  tool_id: string;
  parameters: Record<string, any>;
  timeout_ms?: number;
}

export interface MCPToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface MCPConnectionRecord {
  projectId: string;
  server: MCPServer;
  lastActive: number;
}

export interface MCPServer {
  id: string;
  name: string;
  baseUrl: string;
  isConnected: () => boolean;
  isConnectionActive: () => boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  listTools: () => Promise<MCPToolDefinition[]>;
  executeToolById: (params: MCPToolExecutionParams) => Promise<MCPToolExecutionResult>;
  callTool: (toolId: string, parameters: Record<string, any>) => Promise<any>;
  projectId: string;
}

// Configuration constants
export const CONNECTION_CONFIG = {
  initialBackoff: 1000,
  maxBackoff: 30000,
  maxRetries: 5,
  connectionTimeout: 15000,
  healthCheckInterval: 60000,
  minReconnectInterval: 5000
};
