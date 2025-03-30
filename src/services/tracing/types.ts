
export interface TraceEvent {
  eventType: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface TraceSummary {
  traceId: string;
  runId: string;
  agentType: string;
  duration: number;
  handoffs: number;
  toolCalls: number;
  messageCount: number;
  modelUsed: string;
  success: boolean;
}

export interface AgentTrace {
  events: TraceEvent[];
  summary: TraceSummary;
}

export interface TraceRecord {
  user_id: string;
  agent_type: string;
  user_message: string;
  assistant_response: string;
  has_attachments?: boolean;
  timestamp: string;
  metadata: {
    trace: AgentTrace;
    [key: string]: any;
  };
}

export interface ConversationTraceData {
  messages: TraceRecord[];
  summary: {
    agent_types: string[];
    duration: number;
    handoffs: number;
    tool_calls: number;
    message_count: number;
    model_used: string;
    success: boolean;
  };
}

export interface AgentAnalytics {
  total_traces: number;
  total_messages: number;
  total_handoffs: number;
  total_tool_calls: number;
  avg_response_time: number;
  agent_usage: Record<string, number>;
  model_usage: Record<string, number>;
}

export interface ConversationSummary {
  conversation_id: string;
  start_time: string;
  end_time: string;
  message_count: number;
  agent_types: string[];
  model_used: string;
}
