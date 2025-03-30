
export interface MCPServer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  cleanup(): Promise<void>;
  listTools(): Promise<any[]>;
  callTool(name: string, parameters: any): Promise<any>;
  invalidateToolsCache(): void;
  isConnected(): boolean;
  isConnectionActive(): boolean;
  getConnectionError(): Error | null;
}

export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (value: boolean) => void;
  isConnecting: boolean;
  hasConnectionError: boolean;
  reconnectToMcp: () => Promise<boolean>;
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

export interface MCPToolExecutionParams {
  sceneId?: string;
  projectId?: string;
  [key: string]: any;
}

export interface MCPToolExecutionResult {
  success: boolean;
  result?: string;
  data?: any;
  error?: string;
  [key: string]: any;
}
