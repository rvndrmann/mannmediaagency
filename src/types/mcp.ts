
export interface MCPServer {
  id: string;
  projectId: string;
  status: string;
  url: string;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  isConnected: () => boolean;
  isConnectionActive: () => boolean;
  listTools: () => Promise<any[]>;
  executeTool: (toolName: string, parameters: any) => Promise<any>;
}

export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (use: boolean) => void;
  isConnecting: boolean;
  hasConnectionError: boolean;
  reconnectToMcp: () => Promise<boolean>;
  lastReconnectAttempt?: number;
  connectionStatus?: string;
  connectionMetrics?: {
    successCount: number;
    failureCount: number;
    averageConnectTime: number;
  };
}

export interface MCPToolExecutionResult {
  success: boolean;
  error?: string;
  data?: any;
  metadata?: any;
}
