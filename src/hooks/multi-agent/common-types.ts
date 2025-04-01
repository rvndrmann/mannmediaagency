
/**
 * Common type definitions for multi-agent system
 * Serves as a bridge between different type systems in the codebase
 */

import { CommandExecutionState as ToolsCommandExecutionState } from './tools/types';
import { CommandExecutionState as RunnerCommandExecutionState } from './runner/types';

// A unified command execution state that can be used across the codebase
export enum UnifiedCommandExecutionState {
  COMPLETED = "completed",
  FAILED = "failed",
  PROCESSING = "processing",
  ERROR = "error",
  PENDING = "pending",
  RUNNING = "running",
  CANCELLED = "cancelled"
}

// Map between different CommandExecutionState enums
export function mapCommandExecutionState(state: string | UnifiedCommandExecutionState): UnifiedCommandExecutionState {
  switch(state) {
    case 'completed': 
      return UnifiedCommandExecutionState.COMPLETED;
    case 'failed': 
      return UnifiedCommandExecutionState.FAILED;
    case 'processing': 
      return UnifiedCommandExecutionState.PROCESSING;
    case 'error': 
      return UnifiedCommandExecutionState.ERROR;
    case 'pending':
      return UnifiedCommandExecutionState.PENDING;
    case 'running':
      return UnifiedCommandExecutionState.RUNNING;
    case 'cancelled':
      return UnifiedCommandExecutionState.CANCELLED;
    default:
      return UnifiedCommandExecutionState.FAILED;
  }
}

// Common tool context interface that works across different tool implementations
export interface UnifiedToolContext {
  supabase: any;
  user?: any;
  session?: any;
  userId?: string;
  projectId?: string;
  sessionId?: string;
  [key: string]: any;
}

// Common tool execution result interface that works across different tool implementations
export interface UnifiedToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  state: UnifiedCommandExecutionState | string;
  error?: string;
  usage?: {
    creditsUsed?: number;
  };
}

// Function to safely convert an Error to a string
export function errorToString(error: unknown): string {
  if (error === null || error === undefined) {
    return '';
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}
