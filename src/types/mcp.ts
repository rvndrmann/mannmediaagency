
export interface MCPServer {
  connect(): Promise<void>;
  listTools(): Promise<any[]>;
  callTool(name: string, parameters: any): Promise<any>;
  cleanup(): Promise<void>;
  invalidateToolsCache(): void;
  isConnected?(): boolean;
  getName?(): string;
  getServerUrl?(): string;
}

export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (value: boolean) => void;
}

export interface MCPToolParameters {
  sceneId?: string;
  imageAnalysis?: boolean;
  useDescription?: boolean;
  productShotVersion?: string;
  aspectRatio?: string;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResponse {
  success: boolean;
  result?: string;
  error?: string;
  [key: string]: any;
}
