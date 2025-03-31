
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

export interface MCPToolExecutionParams {
  [key: string]: any;
}

export interface MCPToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MCPConnectionRecord {
  id: string;
  projectId: string;
  userId: string;
  connectionUrl: string;
  lastConnectedAt: string;
  isActive: boolean;
}

export interface MCPServer {
  id: string;
  url: string;
  status: string;
  
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): boolean;
  isConnectionActive(): boolean;
  getConnectionError(): Error | null;
  
  listTools(): Promise<MCPToolDefinition[]>;
  executeTool(toolName: string, parameters: MCPToolExecutionParams): Promise<MCPToolExecutionResult>;
  
  cleanup(): Promise<void>;
  invalidateToolsCache(): void;
}
