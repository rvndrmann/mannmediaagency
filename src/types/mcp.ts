
export interface MCPServer {
  connect(): Promise<void>;
  listTools(): Promise<any[]>;
  callTool(name: string, parameters: any): Promise<any>;
  callToolStream?(name: string, parameters: any, onProgress?: (data: any) => void): Promise<any>;
  cleanup(): Promise<void>;
  invalidateToolsCache(): void;
  getConnectionStatus(): string;
  getConnectionInfo?(): { status: string; connectedSince: number | null; lastActivity: number };
}

export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (value: boolean) => void;
}

export interface MCPStreamProgress {
  type: string;
  step: string;
  message: string;
  percent?: number;
  data?: any;
}

export interface MCPStreamResult {
  complete: boolean;
  result?: any;
  progress?: MCPStreamProgress;
  error?: string;
}
