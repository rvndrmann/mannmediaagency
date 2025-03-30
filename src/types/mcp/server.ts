
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
