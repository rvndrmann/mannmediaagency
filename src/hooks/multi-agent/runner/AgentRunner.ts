
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Message, Attachment, Command } from "@/types/message";
import { toolExecutor } from "../tool-executor";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { detectToolCommand } from "../tool-parser";
import { 
  RunConfig, RunEvent, RunHooks, RunResult, 
  RunState, RunStatus, TraceManager, Trace,
  ToolContext, ToolResult
} from "../types";

class AgentRunner {
  private agentType: AgentType;
  private config: RunConfig;
  private hooks: RunHooks;
  private state: RunState;
  private traceManager: TraceManager;
  private currentTrace: Trace | null = null;

  constructor(
    agentType: AgentType,
    config: RunConfig = {},
    hooks: RunHooks = {}
  ) {
    this.agentType = agentType;
    this.config = {
      model: config.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
      maxTurns: config.maxTurns || 10,
      tracingDisabled: config.tracingDisabled || false,
      enableDirectToolExecution: config.enableDirectToolExecution ?? true,
      metadata: config.metadata || {},
      runId: config.runId || uuidv4(),
      groupId: config.groupId
    };
    this.hooks = hooks;
    this.state = {
      currentAgentType: agentType,
      messages: [],
      handoffInProgress: false,
      turnCount: 0,
      status: "pending",
      lastMessageIndex: -1,
      toolContext: {
        userId: (config.metadata?.userId as string) || "",
        creditsRemaining: 0,
        previousOutputs: {}
      },
      enableDirectToolExecution: config.enableDirectToolExecution
    };
    this.traceManager = new TraceManager(!config.tracingDisabled);
  }

  // Main method to run the agent
  async run(userInput: string, attachments?: Attachment[], userId?: string): Promise<RunResult> {
    try {
      // Start a new trace
      if (this.traceManager.isTracingEnabled() && userId) {
        this.currentTrace = this.traceManager.startTrace(
          userId,
          this.config.runId
        );
      }

      // Initialize state
      this.state.status = "running";
      this.state.currentAgentType = this.agentType;
      this.state.messages = [];
      this.state.turnCount = 0;
      
      if (userId && this.state.toolContext) {
        this.state.toolContext.userId = userId;
      }

      // Add user input to messages
      const userMessage: Message = {
        role: "user",
        content: userInput,
        attachments
      };
      
      this.state.messages.push(userMessage);
      
      // Emit initial event
      this.emitEvent({
        type: "thinking",
        agentType: this.state.currentAgentType
      });
      
      // First call to get AI response
      const response = await this.callAgentAPI(userInput, attachments);
      this.state.messages.push(response);
      
      // Emit message event
      this.emitEvent({
        type: "message",
        message: response
      });
      
      // Process command if present
      if (response.command) {
        await this.processCommand(response.command);
      }
      
      // Check if handoff was requested
      if (response.handoffRequest) {
        await this.handleHandoff(response.handoffRequest.targetAgent, response.handoffRequest.reason);
      }
      
      // Finalize the trace
      if (this.traceManager.isTracingEnabled() && this.currentTrace) {
        this.traceManager.finishTrace();
      }
      
      // Set the final status
      this.state.status = "completed";
      
      return {
        state: this.state,
        output: this.state.messages,
        success: true,
        metrics: {
          totalDuration: 0, // Would calculate real duration in production
          turnCount: this.state.turnCount,
          toolCalls: 0, // Would track tool calls in production
          handoffs: 0, // Would track handoffs in production
          messageCount: this.state.messages.length
        }
      };
      
    } catch (error) {
      console.error("Agent run error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Emit error event
      this.emitEvent({
        type: "error",
        error: errorMessage
      });
      
      // Update state
      this.state.status = "error";
      
      // Finalize trace with error
      if (this.traceManager.isTracingEnabled() && this.currentTrace) {
        this.traceManager.finishTrace();
      }
      
      return {
        state: this.state,
        output: this.state.messages,
        success: false,
        error: errorMessage
      };
    }
  }
  
  // Helper to call the agent API and get response
  private async callAgentAPI(
    userInput: string,
    attachments?: Attachment[]
  ): Promise<Message> {
    // In a real implementation, this would call an API
    // For now, we'll simulate a response
    
    this.state.turnCount++;
    
    // Return a mock response
    return {
      role: "assistant",
      content: `I am the ${this.state.currentAgentType} agent. I received your message: "${userInput}"`,
      agentType: this.state.currentAgentType
    };
  }
  
  // Process tool command
  private async processCommand(command: Command): Promise<ToolResult> {
    // Emit tool start event
    this.emitEvent({
      type: "tool_start",
      command
    });
    
    // Execute the command
    const result = await toolExecutor.executeCommand(command, this.state.toolContext || { 
      userId: "", 
      creditsRemaining: 0 
    });
    
    // Emit tool end event
    this.emitEvent({
      type: "tool_end",
      result
    });
    
    // Store the result
    this.state.lastToolResult = result;
    
    return result;
  }
  
  // Handle agent handoff
  private async handleHandoff(targetAgent: AgentType, reason: string): Promise<void> {
    // Emit handoff start event
    this.emitEvent({
      type: "handoff_start",
      from: this.state.currentAgentType,
      to: targetAgent,
      reason
    });
    
    // Update state
    this.state.handoffInProgress = true;
    this.state.currentAgentType = targetAgent;
    
    // Emit handoff end event
    this.emitEvent({
      type: "handoff_end",
      to: targetAgent
    });
  }
  
  // Event helper
  private emitEvent(event: RunEvent): void {
    // Handle specific event types
    switch (event.type) {
      case "thinking":
        this.hooks.onThinking?.(event.agentType);
        break;
      case "message":
        this.hooks.onMessage?.(event.message);
        break;
      case "tool_start":
        this.hooks.onToolStart?.(event.command);
        break;
      case "tool_end":
        this.hooks.onToolEnd?.(event.result);
        break;
      case "handoff_start":
        this.hooks.onHandoffStart?.(event.from, event.to, event.reason);
        break;
      case "handoff_end":
        this.hooks.onHandoffEnd?.(event.to);
        break;
      case "error":
        this.hooks.onError?.(event.error);
        break;
      case "completed":
        this.hooks.onCompleted?.(event.result);
        break;
    }
    
    // General event handler
    this.hooks.onEvent?.(event);
    
    // Record in trace
    if (this.traceManager.isTracingEnabled() && this.state.toolContext?.userId) {
      this.traceManager.recordEvent(
        event.type,
        this.state.currentAgentType,
        event
      );
    }
  }
}

export { AgentRunner };
