
import { Message, Attachment } from "@/types/message";
import { SupabaseClient } from "@supabase/supabase-js";

export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data" | string;

export interface AgentResult {
  response: string;
  output?: any;
  nextAgent: AgentType | null;
  handoffReason?: string;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: Record<string, any>;
  };
  structured_output?: any;
  additionalContext?: Record<string, any>;
  commandSuggestion?: any;
}

export interface RunnerContext {
  addMessage?: (message: string, type: string) => void;
  supabase: SupabaseClient;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  runId?: string;
  enableDirectToolExecution?: boolean;
  tracingEnabled?: boolean;
  usePerformanceModel?: boolean;
  history?: any[];
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface RunnerCallbacks {
  onHandoff?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffStart?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffEnd?: (fromAgent: AgentType, toAgent: AgentType, result: AgentResult) => void;
  onError?: (error: Error) => void;
  onAgentProcessStart?: (agentType: AgentType) => void;
  onAgentProcessEnd?: (agentType: AgentType, result: AgentResult) => void;
}

export interface ToolContext {
  addMessage?: (message: string, type: string) => void;
  supabase: SupabaseClient<any, "public", any>;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  runId?: string;
  enableDirectToolExecution?: boolean;
  history?: any[];
  attachments?: Attachment[];
  tracingEnabled?: boolean;
  toolAvailable: boolean;
  metadata?: Record<string, any>;
  usePerformanceModel?: boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
  usage?: {
    creditsUsed: number;
  };
}

export enum CommandExecutionState {
  PENDING = "pending",
  EXECUTING = "executing",
  COMPLETED = "completed",
  ERROR = "error"
}

export interface AgentOptions {
  context: RunnerContext;
  traceId?: string;
  model?: string;
  config?: any;
}

export abstract class BaseAgentImpl {
  protected traceId: string;
  protected context: RunnerContext;
  protected model?: string;
  protected config?: any;

  constructor(options: AgentOptions) {
    this.traceId = options.traceId || "no-trace";
    this.context = options.context;
    this.model = options.model;
    this.config = options.config;
  }

  abstract process(input: string, context: RunnerContext): Promise<AgentResult>;
  
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return this.process(input, context);
  }
  
  abstract getType(): AgentType;

  protected createBasicResult(output: string): AgentResult {
    return {
      response: output,
      output: output,
      nextAgent: null
    };
  }

  protected formatResponse(output: any, nextAgent: AgentType | null = null, handoffReason?: string, structured_output?: any, additionalContext?: Record<string, any>): AgentResult {
    return {
      response: output,
      output: output,
      nextAgent,
      handoffReason,
      structured_output,
      additionalContext
    };
  }

  protected getTraceInfo(): string {
    return `Agent:${this.getType()},TraceID:${this.traceId}`;
  }

  protected isTracingEnabled(): boolean {
    return this.context.tracingEnabled !== false;
  }
}

export interface BaseAgent {
  run(input: string, context: RunnerContext): Promise<AgentResult>;
  getType(): AgentType; 
}
