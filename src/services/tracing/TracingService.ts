
import { supabase } from "@/integrations/supabase/client";
import { AgentAnalytics, ConversationSummary, ConversationTraceData, TraceEvent } from "./types";
import { v4 as uuidv4 } from "uuid";

export class TracingService {
  private static instance: TracingService;
  private traceId: string | null = null;
  private runId: string | null = null;
  private userId: string | null = null;
  private agentType: string | null = null;
  private startTime: number = 0;
  private events: TraceEvent[] = [];
  private isTraceActive: boolean = false;

  private constructor() {}

  static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }

  startTrace(options: {
    userId: string;
    runId?: string;
    agentType: string;
    projectId?: string;
  }): string {
    this.userId = options.userId;
    this.runId = options.runId || uuidv4();
    this.agentType = options.agentType;
    this.traceId = uuidv4();
    this.startTime = Date.now();
    this.events = [];
    this.isTraceActive = true;

    // Add initial trace event
    this.addEvent('trace_start', {
      agentType: this.agentType,
      projectId: options.projectId,
      userId: this.userId
    });

    return this.traceId;
  }

  getTraceId(): string | null {
    return this.traceId;
  }

  getRunId(): string | null {
    return this.runId;
  }

  isActive(): boolean {
    return this.isTraceActive;
  }

  addEvent(eventType: string, data: Record<string, any>): void {
    if (!this.isTraceActive) {
      console.warn("Attempted to add event to inactive trace");
      return;
    }

    const event: TraceEvent = {
      eventType,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        agentType: data.agentType || this.agentType
      }
    };

    this.events.push(event);
  }

  async endTrace(options: {
    success: boolean;
    userMessage: string;
    assistantResponse: string;
    hasAttachments?: boolean;
    handoffs?: number;
    toolCalls?: number;
    messageCount?: number;
    modelUsed?: string;
  }): Promise<void> {
    if (!this.isTraceActive) {
      console.warn("Attempted to end inactive trace");
      return;
    }

    const duration = Date.now() - this.startTime;
    
    // Add end trace event
    this.addEvent('trace_end', {
      duration,
      success: options.success
    });

    // Prepare trace summary
    const traceSummary = {
      traceId: this.traceId!,
      runId: this.runId!,
      duration,
      agentType: this.agentType!,
      handoffs: options.handoffs || 0,
      toolCalls: options.toolCalls || 0,
      messageCount: options.messageCount || 0,
      modelUsed: options.modelUsed || 'unknown',
      success: options.success
    };

    // Save trace to database
    if (this.userId) {
      try {
        await supabase.from('agent_interactions').insert({
          user_id: this.userId,
          agent_type: this.agentType!,
          user_message: options.userMessage,
          assistant_response: options.assistantResponse,
          has_attachments: options.hasAttachments || false,
          metadata: {
            trace: {
              runId: this.runId,
              traceId: this.traceId,
              duration,
              timestamp: new Date().toISOString(),
              events: this.events,
              summary: traceSummary
            }
          }
        });
      } catch (error) {
        console.error("Error saving trace data:", error);
      }
    }

    // Reset the trace state
    this.isTraceActive = false;
  }

  static async getUserAnalytics(userId: string): Promise<AgentAnalytics | null> {
    try {
      const { data, error } = await supabase
        .rpc<AgentAnalytics>('get_agent_trace_analytics', { user_id_param: userId });
      
      if (error) {
        console.error("Error getting agent analytics:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getUserAnalytics:", error);
      return null;
    }
  }
  
  static async getConversationTrace(
    conversationId: string,
    userId: string
  ): Promise<ConversationTraceData | null> {
    try {
      const { data, error } = await supabase
        .rpc<ConversationTraceData>('get_conversation_trace', { 
          conversation_id: conversationId,
          user_id_param: userId
        });
      
      if (error) {
        console.error("Error getting conversation trace:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getConversationTrace:", error);
      return null;
    }
  }
  
  static async getUserConversations(userId: string): Promise<ConversationSummary[] | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_conversations', { 
        user_id_param: userId
      });
      
      if (error) {
        console.error("Error getting user conversations:", error);
        return null;
      }
      
      return data as ConversationSummary[];
    } catch (error) {
      console.error("Error in getUserConversations:", error);
      return null;
    }
  }
}
