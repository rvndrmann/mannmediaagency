
export interface MCPServerConfig {
  serverUrl: string;
  projectId?: string;
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
}

export interface MCPConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionError(): Error | null;
  listTools(): Promise<MCPToolDefinition[]>;
  callTool(name: string, parameters: MCPToolExecutionParams): Promise<MCPToolExecutionResult>;
}
