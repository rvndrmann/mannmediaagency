
import { AgentType, RunnerContext } from "./runner/types";

export type Command = {
  name: string;
  parameters: Record<string, any>;
};

export type AgentCommandHandler = (command: Command) => Promise<void>;

// Type definitions for project management
export interface CanvasProjectData {
  id: string;
  title: string;
  description?: string;
  scenes?: Array<{
    id: string;
    title: string;
    content?: string;
  }>;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  fontSize?: 'small' | 'medium' | 'large';
  notifications?: boolean;
}

// Agent communication types
export interface AgentCommunication {
  from: AgentType;
  to: AgentType;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentHandoff {
  fromAgent: AgentType;
  toAgent: AgentType;
  reason: string;
  contextData: Record<string, any>;
  timestamp: string;
}

// Tool execution types
export interface ToolCallParams {
  toolName: string;
  parameters: Record<string, any>;
}

export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}
