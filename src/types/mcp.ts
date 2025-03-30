
export interface MCPServer {
  connect(): Promise<void>;
  listTools(): Promise<any[]>;
  callTool(name: string, parameters: any): Promise<any>;
  cleanup(): Promise<void>;
  invalidateToolsCache(): void;
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
