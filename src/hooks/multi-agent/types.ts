
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment } from "@/types/message";
import { HandoffOptions } from "./handoff/types";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
  version?: string;
  execute: (params: any, context: ToolContext) => Promise<ToolExecutionResult>;
}

export interface ToolContext {
  supabase: typeof supabase;
  runId: string;
  groupId: string;
  userId: string;
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: Record<string, any>;
  abortSignal?: AbortSignal;
  addMessage: (text: string, type: string, attachments?: Attachment[]) => void;
  toolAvailable: (toolName: string) => boolean;
  creditsRemaining?: number;
  attachments?: Attachment[];
  executeTool?: (toolName: string, params: any) => Promise<any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    creditsUsed: number;
  };
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ToolExecutionOptions {
  abortSignal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onPartialResult?: (result: any) => void;
}

export interface TraceItem {
  id: string;
  timestamp: string;
  type: 'agent_start' | 'agent_end' | 'tool_start' | 'tool_end' | 'handoff' | 'error';
  data: Record<string, any>;
}

export interface AgentTrace {
  id: string;
  runId: string;
  groupId: string;
  agentType: string;
  startTime: string;
  endTime?: string;
  steps: TraceItem[];
  input: string;
  output?: string;
  status: 'running' | 'completed' | 'error';
  metadata?: Record<string, any>;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
  context?: Record<string, any>;
}

export enum CommandExecutionState {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// New interfaces to align with OpenAI Agents SDK
export interface ModelSettings {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  tool_choice?: 'auto' | 'required' | 'none' | string;
}

export interface AgentConfig {
  name: string;
  instructions: string | ((context: ToolContext) => string | Promise<string>);
  handoffDescription?: string;
  modelName: string;
  modelSettings?: ModelSettings;
  tools?: ToolDefinition[];
  handoffs?: HandoffOptions[]; // Added support for handoffs
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail[];
  outputType?: any;
  toolUseBehavior?: 'run_llm_again' | 'stop_on_first_tool' | string[];
  resetToolChoice?: boolean;
}

export interface InputGuardrail {
  name: string;
  description: string;
  checkInput: (input: string, context: ToolContext) => Promise<GuardrailResult>;
}

export interface OutputGuardrail {
  name: string;
  description: string;
  checkOutput: (output: any, context: ToolContext) => Promise<GuardrailResult>;
}

export interface GuardrailResult {
  passed: boolean;
  message?: string;
  action?: 'block' | 'warn' | 'log';
}
