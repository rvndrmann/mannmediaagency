
import { MCPServer } from './server';

export interface MCPContext {
  mcpServers: MCPServer[];
  useMcp: boolean;
  setUseMcp: (value: boolean) => void;
}
