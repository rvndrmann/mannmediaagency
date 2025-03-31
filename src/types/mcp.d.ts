
export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (useMcp: boolean) => void;
  isConnecting: boolean;
  hasConnectionError: boolean;
  reconnectToMcp: () => Promise<boolean>;
  lastReconnectAttempt: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionMetrics: MCPConnectionMetrics;
  // Add connectionStats to the interface
  connectionStats: {
    totalClients: number;
    connectedClients: number;
    lastConnectionAttempt: number;
  };
}
