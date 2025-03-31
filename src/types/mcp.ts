
export interface MCPServer {
  id: string;
  projectId: string;
  status: string;
  url: string;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  isConnected: () => boolean;
  isConnectionActive: () => boolean;
  cleanup: () => Promise<void>;
  listTools: () => Promise<MCPToolDefinition[]>;
  executeTool: (toolName: string, parameters: MCPToolExecutionParams) => Promise<MCPToolExecutionResult>;
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

export interface MCPToolExecutionParams {
  sceneId?: string;
  projectId?: string;
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

export interface MCPConnectionRecord {
  id: string;
  projectId: string;
  userId: string;
  connectionUrl: string;
  lastConnectedAt: string;
  isActive: boolean;
}
