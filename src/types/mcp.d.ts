
// MCP Types
export interface MCPServer {
  id: string;
  url: string;
  updateInterval: number;
}

export interface MCPConnectionMetrics {
  successCount: number;
  failureCount: number;
  averageConnectTime: number;
}

export interface MCPConnectionStats {
  totalClients: number;
  connectedClients: number;
  lastConnectionAttempt: number;
}

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
  connectionStats: MCPConnectionStats;
}

export interface MCPProviderProps {
  children: React.ReactNode;
  projectId?: string;
}

export const CONNECTION_CONFIG = {
  minReconnectInterval: 5000,
  maxRetries: 3,
  connectionTimeout: 10000
};
