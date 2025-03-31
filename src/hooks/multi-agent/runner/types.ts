
import { Attachment } from "@/types/message";
import { SupabaseClient } from "@supabase/supabase-js";

export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data";

export interface RunnerContext {
  supabase: SupabaseClient;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  runId?: string;
  metadata?: Record<string, any>;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  tracingDisabled?: boolean;
  addMessage?: (message: string, type: string) => void;
  credits?: number;
  history?: any[];
}

export interface AgentOptions {
  context: RunnerContext;
  traceId?: string;
  model?: string;
  config?: Record<string, any>;
}

export interface RunnerCallbacks {
  onHandoff?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffStart?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffEnd?: (fromAgent: AgentType, toAgent: AgentType, result: AgentResult) => void;
  onError?: (error: Error) => void;
  onAgentStart?: (agentType: AgentType) => void;
  onAgentEnd?: (agentType: AgentType, result: AgentResult) => void;
  onToolUse?: (toolName: string, parameters: any) => void;
  onToolResult?: (toolName: string, result: any) => void;
}

export interface AgentResult {
  output: string;
  response?: string;
  nextAgent?: AgentType | null;
  handoffReason?: string | null;
  structured_output?: any;
  additionalContext?: any;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: any;
  };
  commandSuggestion?: any;
}

export interface BaseAgent {
  run(input: string, attachments: Attachment[]): Promise<AgentResult>;
  getType(): AgentType;
}

export abstract class BaseAgentImpl implements BaseAgent {
  protected context: RunnerContext;
  protected traceId?: string;
  
  constructor(options: { context: RunnerContext; traceId?: string }) {
    this.context = options.context;
    this.traceId = options.traceId;
  }
  
  abstract run(input: string, attachments: Attachment[]): Promise<AgentResult>;
  
  abstract getType(): AgentType;
  
  protected recordTraceEvent(event: string, data?: any): void {
    if (this.context.tracingDisabled) return;
    
    console.log(`[TRACE:${this.traceId || 'unknown'}] [${event}]`, data);
    
    if (this.context.addMessage) {
      if (typeof data === 'string') {
        this.context.addMessage(data, event);
      } else if (data) {
        this.context.addMessage(JSON.stringify(data), event);
      } else {
        this.context.addMessage(event, 'trace');
      }
    }
  }
  
  protected async getInstructions(context: RunnerContext): Promise<string> {
    // Default implementation returns empty string
    // Agent implementations should override this
    return "";
  }
  
  protected async applyInputGuardrails(input: string): Promise<string> {
    // Apply any input guardrails here
    return input;
  }
  
  protected async applyOutputGuardrails(output: string): Promise<string> {
    // Apply any output guardrails here
    return output;
  }
  
  process(input: string, context: RunnerContext): Promise<AgentResult> {
    // For compatibility with older code
    return this.run(input, []);
  }
}
