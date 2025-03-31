
export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data";

export interface RunnerContext {
  supabase: any;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  runId?: string;
  groupId?: string;
  metadata?: Record<string, any>;
  tracingDisabled?: boolean;
  addMessage?: (message: string, type: string) => void;
  attachments?: any[];
  credits?: number;
  history?: any[];
}

export interface AgentOptions {
  context?: RunnerContext;
  traceId?: string;
  config?: any;
  model?: string;
}

export interface AgentResult {
  output: string;
  nextAgent?: AgentType;
  handoffReason?: string;
  structured_output?: any;
  additionalContext?: any;
  // Additional properties needed
  response?: string;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: any;
  };
  commandSuggestion?: any;
}

export interface RunnerCallbacks {
  onHandoff?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffStart?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffEnd?: (from: AgentType, to: AgentType, result: AgentResult) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: string, agentType: AgentType) => void;
  onExecute?: (command: string, parameters: any) => void;
  onComplete?: (result: AgentResult) => void;
}

// Interface for the base agent implementation
export interface BaseAgent {
  processInput(input: string, context: RunnerContext): Promise<AgentResult>;
  getType(): AgentType;
  getName(): string;
  getDescription(): string;
}

// Abstract class for agent implementations
export abstract class BaseAgentImpl implements BaseAgent {
  protected traceId: string;
  protected context: RunnerContext;

  constructor(options: { context: RunnerContext; traceId?: string }) {
    this.context = options.context;
    this.traceId = options.traceId || "";
  }

  abstract process(input: string, context: RunnerContext): Promise<AgentResult>;

  // Default implementation of getType
  getType(): AgentType {
    return "main";
  }

  // Default implementation of getName
  getName(): string {
    return "Base Agent";
  }

  // Default implementation of getDescription
  getDescription(): string {
    return "Base agent implementation";
  }

  // Method to record trace messages
  protected logTrace(message: string, type: string = "info"): void {
    if (this.context.addMessage) {
      this.context.addMessage(message, type);
    }
  }

  // Process input with common logging
  async processInput(input: string, context: RunnerContext): Promise<AgentResult> {
    this.logTrace(`Agent ${this.getType()} processing input`, "agent_start");
    try {
      const result = await this.process(input, context);
      this.logTrace(`Agent ${this.getType()} completed processing`, "agent_complete");
      return result;
    } catch (error) {
      this.logTrace(`Agent ${this.getType()} error: ${error}`, "agent_error");
      throw error;
    }
  }
}
