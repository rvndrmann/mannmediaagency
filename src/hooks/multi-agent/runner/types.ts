
import { SupabaseClient } from '@supabase/supabase-js';

// Agent types
export type AgentType = 
  | "main" 
  | "assistant" 
  | "script" 
  | "image" 
  | "tool" 
  | "scene" 
  | "data";

// Tool execution result states - Added from multi-agent/types.ts
export enum CommandExecutionState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  ERROR = "error"
}

// Base context for runners and agents
export interface RunnerContext {
  supabase: SupabaseClient<any, "public", any>;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  userCredits?: number;
  tracingEnabled?: boolean;
  enableDirectToolExecution?: boolean;
  addMessage?: (message: string, type: string) => void;
  metadata?: Record<string, any>;
  history?: any[];
}

// Tool execution result interface
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  state?: CommandExecutionState;
  data?: any;
  error?: string;
  usage?: {
    creditsUsed?: number;
  };
}

// Agent result interface used by all agents
export interface AgentResult {
  response: string;
  nextAgent: AgentType | null;
  handoffReason?: string;
  additionalContext?: any;
  output?: string;
  structured_output?: any;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: any;
  };
}

// Base agent interface
export interface BaseAgent {
  run(input: string, context: RunnerContext): Promise<AgentResult>;
  getType(): AgentType;
}

// Base abstract agent implementation
export abstract class BaseAgentImpl implements BaseAgent {
  protected name: string;
  protected instructions: string;
  protected tools?: any[];

  constructor(options: AgentOptions) {
    this.name = options.name;
    this.instructions = options.instructions;
    this.tools = options.tools || [];
  }

  abstract process(input: string, context: RunnerContext): Promise<AgentResult>;

  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      return this.process(input, context);
    } catch (error) {
      console.error(`Error in ${this.name} agent:`, error);
      return {
        response: `Error executing agent: ${error instanceof Error ? error.message : String(error)}`,
        nextAgent: null
      };
    }
  }

  getType(): AgentType {
    return "main";
  }

  protected recordTraceEvent(event: any): void {
    console.log(`[TRACE] ${this.name}:`, event);
  }

  protected async applyInputGuardrails(input: string): Promise<string> {
    // In a real implementation, this would apply input guardrails
    return input;
  }
}

// Agent options interface
export interface AgentOptions {
  name: string;
  instructions: string;
  tools?: any[];
}

// Runner callbacks
export interface RunnerCallbacks {
  onHandoff?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffStart?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffEnd?: (fromAgent: AgentType, toAgent: AgentType, result: AgentResult) => void;
  onError?: (error: Error) => void;
}

// Helper type for tools to stop at
export interface StopAtTools {
  stop_at_tool_names: string[];
}
