
export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (enabled: boolean) => void;
  isConnecting: boolean;
  hasConnectionError: boolean;
  reconnectToMcp: () => Promise<boolean>;
  lastReconnectAttempt: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionMetrics: {
    successCount: number;
    failureCount: number;
    averageConnectTime: number;
  };
}
