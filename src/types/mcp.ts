
export interface MCPServer {
  connect(): Promise<void>;
  listTools(): Promise<any[]>;
  callTool(name: string, parameters: any): Promise<any>;
  cleanup(): Promise<void>;
  invalidateToolsCache(): void;
  isConnectionActive?(): boolean;
  getConnectionError?(): Error | null;
}

export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (value: boolean) => void;
  isConnecting: boolean;
  hasConnectionError: boolean;
  reconnectToMcp: () => Promise<boolean>;
}
