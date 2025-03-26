
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { AgentType, BUILT_IN_AGENT_TYPES } from "@/hooks/use-multi-agent-chat";
import { Attachment, Command, Message, Task } from "@/types/message";
import { RunConfig, RunEvent, RunHooks, RunResult, RunState, RunStatus, TraceManager, Trace, ToolContext, ToolResult } from "../types";
import { parseToolCommand } from "../tool-parser";
import { toolExecutor } from "../tool-executor";
import { getToolsForLLM } from "../tools";

const DEFAULT_MAX_TURNS = 10;
const CHAT_CREDIT_COST = 0.07;

/**
 * AgentRunner orchestrates the execution of agents, handling the run loop,
 * tool execution, handoffs, and event emission.
 */
export class AgentRunner {
  private state: RunState;
  private config: RunConfig;
  private hooks: RunHooks;
  private userId?: string;
  private traceManager: TraceManager;
  private runStartTime: number;
  
  constructor(
    initialAgentType: AgentType,
    config: RunConfig = {},
    hooks: RunHooks = {}
  ) {
    this.state = {
      currentAgentType: initialAgentType,
      messages: [],
      handoffInProgress: false,
      turnCount: 0,
      status: "pending" as RunStatus,
      lastMessageIndex: -1,
      isCustomAgent: !BUILT_IN_AGENT_TYPES.includes(initialAgentType),
      enableDirectToolExecution: config.enableDirectToolExecution || false
    };
    
    this.config = {
      maxTurns: DEFAULT_MAX_TURNS,
      usePerformanceModel: false,
      tracingDisabled: false,
      enableDirectToolExecution: false,
      ...config,
      runId: config.runId || uuidv4()
    };
    
    this.hooks = hooks;
    this.traceManager = new TraceManager(!this.config.tracingDisabled);
    this.runStartTime = Date.now();
  }
  
  /**
   * Run the agent with the given input
   */
  async run(
    input: string, 
    attachments: Attachment[] = [], 
    userId?: string
  ): Promise<RunResult> {
    this.userId = userId;
    
    // Start trace if user ID is provided and tracing is enabled
    if (userId && this.traceManager.isTracingEnabled()) {
      this.traceManager.startTrace(userId, this.config.runId!);
      console.log(`Started trace for run ${this.config.runId}`);
    }
    
    try {
      // Check credits
      if (userId) {
        const hasCredits = await this.checkCredits(userId);
        if (!hasCredits) {
          this.recordTraceEvent("error", "Insufficient credits");
          throw new Error("Insufficient credits");
        }
      }
      
      // Add user message
      const userMessage: Message = {
        role: "user",
        content: input,
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      this.state.messages.push(userMessage);
      this.emitEvent({ type: "message", message: userMessage });
      this.recordTraceEvent("user_message", userMessage);
      
      // Start the run loop
      this.state.status = "running";
      await this.runLoop();
      
      // Calculate metrics
      const totalDuration = Date.now() - this.runStartTime;
      
      // Count tool calls and handoffs from the message history
      const toolCalls = this.state.messages.filter(m => m.command).length;
      const handoffs = this.state.messages.filter(m => m.handoffRequest).length;
      const messageCount = this.state.messages.length;
      
      // Build result
      const result: RunResult = {
        state: this.state,
        output: this.state.messages,
        success: this.state.status === "completed",
        metrics: {
          totalDuration,
          turnCount: this.state.turnCount,
          toolCalls,
          handoffs,
          messageCount
        }
      };
      
      // Record trace completion
      if (this.traceManager.isTracingEnabled()) {
        const trace = this.traceManager.finishTrace();
        if (trace) {
          // Add complete metrics to trace summary
          if (trace.summary) {
            trace.summary.toolCalls = toolCalls;
            trace.summary.handoffs = handoffs;
            trace.summary.messageCount = messageCount;
          }
          await this.saveTraceToDatabase(trace);
          console.log(`Completed trace ${trace.traceId} for run ${this.config.runId}`);
        }
      }
      
      this.emitEvent({ type: "completed", result });
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.state.status = "error";
      this.recordTraceEvent("error", { message: errorMessage });
      
      // Finish trace with error
      if (this.traceManager.isTracingEnabled()) {
        const trace = this.traceManager.finishTrace();
        if (trace) {
          trace.summary!.success = false;
          await this.saveTraceToDatabase(trace);
          console.log(`Completed trace ${trace.traceId} with error`);
        }
      }
      
      this.emitEvent({ type: "error", error: errorMessage });
      
      return {
        state: this.state,
        output: this.state.messages,
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Main run loop that handles agent execution
   */
  private async runLoop() {
    while (
      this.state.status === "running" && 
      this.state.turnCount < (this.config.maxTurns || DEFAULT_MAX_TURNS)
    ) {
      
      this.state.turnCount++;
      this.recordTraceEvent("turn_start", { turnNumber: this.state.turnCount });
      
      // Execute current turn
      const turnResult = await this.executeTurn();
      
      // Handle turn result
      if (turnResult.handoff) {
        // Process handoff
        await this.handleHandoff(turnResult.handoff.targetAgent, turnResult.handoff.reason);
        continue;
      }
      
      if (turnResult.toolCommand) {
        // Execute tool
        await this.executeToolCommand(turnResult.toolCommand);
        continue;
      }
      
      this.recordTraceEvent("turn_end", { turnNumber: this.state.turnCount });
      
      // No more actions needed, complete the run
      this.state.status = "completed";
      break;
    }
    
    if (this.state.turnCount >= (this.config.maxTurns || DEFAULT_MAX_TURNS)) {
      this.recordTraceEvent("max_turns_exceeded", { maxTurns: this.config.maxTurns || DEFAULT_MAX_TURNS });
      throw new Error("Maximum turns exceeded");
    }
  }
  
  /**
   * Execute a single turn with the current agent
   */
  private async executeTurn() {
    this.emitEvent({ type: "thinking", agentType: this.state.currentAgentType });
    this.recordTraceEvent("thinking", { agentType: this.state.currentAgentType });
    
    const assistantMessage: Message = {
      role: "assistant",
      content: "Processing your request...",
      status: "thinking",
      agentType: this.state.currentAgentType,
      tasks: [
        this.createTask(`Consulting ${this.state.currentAgentType} agent`),
        this.createTask("Preparing response")
      ]
    };
    
    this.state.messages.push(assistantMessage);
    this.state.lastMessageIndex = this.state.messages.length - 1;
    
    try {
      // Get agent response from API
      const response = await this.getAgentResponse();
      
      // Record model usage in trace
      this.recordTraceEvent("model_used", { model: response.modelUsed || "unknown" });
      
      // Update tasks
      this.updateTaskStatus(0, "completed");
      this.updateTaskStatus(1, "in-progress");
      
      // Check if direct tool execution is enabled and we're not using the tool agent
      const shouldCheckForToolCommand = 
        this.state.enableDirectToolExecution || 
        this.state.currentAgentType === "tool";
      
      // Parse response for tool commands if applicable
      const toolCommand = shouldCheckForToolCommand ? 
        parseToolCommand(response.completion) : null;
      
      // Update message
      this.updateMessage(this.state.lastMessageIndex, {
        content: response.completion,
        status: "completed",
        handoffRequest: response.handoffRequest,
        command: toolCommand,
        modelUsed: response.modelUsed
      });
      
      return {
        handoff: response.handoffRequest,
        toolCommand
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      this.updateMessage(this.state.lastMessageIndex, {
        content: `Error: ${errorMessage}`,
        status: "error"
      });
      
      throw error;
    }
  }
  
  /**
   * Get response from the agent API
   */
  private async getAgentResponse() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    // Record API call in trace
    this.recordTraceEvent("api_call_start", { 
      agentType: this.state.currentAgentType,
      messageCount: this.state.messages.length
    });
    
    const startTime = Date.now();
    
    const response = await supabase.functions.invoke("multi-agent-chat", {
      body: {
        messages: this.formatMessages(),
        agentType: this.state.currentAgentType,
        userId: user.id,
        contextData: {
          hasAttachments: this.hasAttachments(),
          attachmentTypes: this.getAttachmentTypes(),
          availableTools: this.state.enableDirectToolExecution || this.state.currentAgentType === "tool" ? 
            getToolsForLLM() : undefined,
          usePerformanceModel: this.config.usePerformanceModel,
          isHandoffContinuation: this.state.handoffInProgress,
          isCustomAgent: this.state.isCustomAgent,
          enableDirectToolExecution: this.state.enableDirectToolExecution,
          traceId: this.traceManager.getCurrentTrace()?.traceId
        }
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Record API call completion in trace
    this.recordTraceEvent("api_call_end", { 
      duration,
      modelUsed: response.data?.modelUsed || "unknown",
      hasHandoff: !!response.data?.handoffRequest,
      contentLength: response.data?.completion?.length || 0
    });
    
    // Specifically record model usage for analytics
    if (response.data?.modelUsed) {
      this.recordTraceEvent("model_used", { 
        model: response.data.modelUsed
      });
    }
    
    if (response.error) {
      this.recordTraceEvent("api_call_error", { error: response.error });
      throw new Error(response.error.message || "Failed to get response from agent");
    }
    
    return response.data;
  }
  
  /**
   * Execute a tool command
   */
  private async executeToolCommand(command: Command) {
    this.emitEvent({ type: "tool_start", command });
    this.recordTraceEvent("tool_start", { command });
    
    const toolTaskId = uuidv4();
    const toolTask = {
      id: toolTaskId,
      name: `Executing ${command.feature}`,
      status: "pending" as Task["status"]
    };
    
    this.updateMessage(this.state.lastMessageIndex, {
      tasks: [...(this.state.messages[this.state.lastMessageIndex].tasks || []), toolTask]
    });
    
    try {
      // Set up tool context
      const toolContext: ToolContext = {
        userId: this.userId || "",
        creditsRemaining: 0, // TODO: Get actual credits
        attachments: this.getAttachments(),
        selectedTool: command.feature,
        previousOutputs: {}
      };
      
      const startTime = Date.now();
      
      // Execute tool
      const result = await toolExecutor.executeCommand(command, toolContext);
      
      const duration = Date.now() - startTime;
      
      this.emitEvent({ type: "tool_end", result });
      this.recordTraceEvent("tool_end", { 
        result,
        duration,
        success: result.success
      });
      
      // Update message with tool result
      const content = `${this.state.messages[this.state.lastMessageIndex].content}\n\n${result.message}`;
      
      this.updateMessage(this.state.lastMessageIndex, {
        content,
        status: "completed",
        tasks: this.state.messages[this.state.lastMessageIndex].tasks?.map(task =>
          task.id === toolTaskId ? {
            ...task,
            status: result.success ? "completed" : "error",
            details: result.success ? undefined : result.message
          } : task
        )
      });
      
      this.state.lastToolResult = result;
      this.state.lastCommand = command;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      this.recordTraceEvent("tool_error", { error: errorMessage });
      
      this.updateMessage(this.state.lastMessageIndex, {
        tasks: this.state.messages[this.state.lastMessageIndex].tasks?.map(task =>
          task.id === toolTaskId ? {
            ...task,
            status: "error",
            details: errorMessage
          } : task
        )
      });
      
      throw error;
    }
  }
  
  /**
   * Handle agent handoff
   */
  private async handleHandoff(targetAgent: AgentType, reason: string) {
    this.emitEvent({ 
      type: "handoff_start", 
      from: this.state.currentAgentType,
      to: targetAgent,
      reason 
    });
    
    this.recordTraceEvent("handoff", { 
      from: this.state.currentAgentType,
      to: targetAgent,
      reason
    });
    
    const handoffMessage: Message = {
      role: "assistant",
      content: `I'm transferring you to the ${targetAgent} agent for better assistance.\n\nReason: ${reason}`,
      status: "completed",
      agentType: this.state.currentAgentType,
      tasks: [{
        id: uuidv4(),
        name: `Transferring to ${targetAgent} agent`,
        status: "completed"
      }]
    };
    
    this.state.messages.push(handoffMessage);
    this.state.currentAgentType = targetAgent;
    this.state.handoffInProgress = true;
    
    // Check if the target agent is a custom agent
    this.state.isCustomAgent = !BUILT_IN_AGENT_TYPES.includes(targetAgent);
    
    this.emitEvent({ type: "handoff_end", to: targetAgent });
    
    toast.info(`Transferred to ${targetAgent} agent for better assistance.`);
  }
  
  // Helper methods
  
  private async checkCredits(userId: string): Promise<boolean> {
    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", userId)
      .single();
      
    return (credits?.credits_remaining || 0) >= CHAT_CREDIT_COST;
  }
  
  private createTask(name: string): Task {
    return {
      id: uuidv4(),
      name,
      status: "pending"
    };
  }
  
  private updateTaskStatus(index: number, status: Task["status"], details?: string) {
    const message = this.state.messages[this.state.lastMessageIndex];
    if (!message.tasks) return;
    
    const updatedTasks = [...message.tasks];
    if (index >= 0 && index < updatedTasks.length) {
      updatedTasks[index] = {
        ...updatedTasks[index],
        status,
        details
      };
    }
    
    this.updateMessage(this.state.lastMessageIndex, { tasks: updatedTasks });
  }
  
  private updateMessage(index: number, updates: Partial<Message>) {
    if (index >= 0 && index < this.state.messages.length) {
      this.state.messages[index] = {
        ...this.state.messages[index],
        ...updates
      };
      
      this.emitEvent({ 
        type: "message", 
        message: this.state.messages[index] 
      });
    }
  }
  
  private formatMessages() {
    return this.state.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.agentType && msg.agentType !== this.state.currentAgentType ? 
          { name: `previous_agent_${msg.agentType}` } : {})
    }));
  }
  
  private hasAttachments(): boolean {
    return this.state.messages.some(msg => 
      msg.attachments && msg.attachments.length > 0
    );
  }
  
  private getAttachmentTypes(): string[] {
    const types = new Set<string>();
    this.state.messages.forEach(msg => {
      msg.attachments?.forEach(att => types.add(att.type));
    });
    return Array.from(types);
  }
  
  private getAttachments(): Attachment[] {
    return this.state.messages
      .flatMap(msg => msg.attachments || []);
  }
  
  private emitEvent(event: RunEvent) {
    this.hooks.onEvent?.(event);
    
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
        this.hooks.onHandoffStart?.(
          event.from, 
          event.to, 
          event.reason
        );
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
  }
  
  /**
   * Record an event in the trace
   */
  private recordTraceEvent(eventType: string, data: any) {
    if (!this.traceManager.isTracingEnabled()) return;
    
    this.traceManager.recordEvent(
      eventType, 
      this.state.currentAgentType,
      data
    );
  }
  
  /**
   * Save the trace to the database
   */
  private async saveTraceToDatabase(trace: Trace) {
    if (!this.userId) return;
    
    try {
      // Enhanced trace metadata
      const enhancedMetadata = {
        trace: {
          id: trace.traceId,
          summary: {
            ...trace.summary,
            // Add all known metrics
            toolCalls: this.state.messages.filter(m => m.command).length,
            handoffs: this.state.messages.filter(m => m.handoffRequest).length,
            messageCount: this.state.messages.length,
            // Find all models used throughout the conversation
            modelUsed: this.findLastUsedModel()
          },
          duration: trace.duration,
          runId: this.config.runId
        }
      };
      
      // Store trace data in the agent_interactions metadata
      await supabase.from("agent_interactions").insert({
        user_id: this.userId,
        agent_type: this.state.currentAgentType,
        user_message: this.state.messages.find(m => m.role === "user")?.content || "",
        assistant_response: this.state.messages.find(m => m.role === "assistant")?.content || "",
        has_attachments: this.hasAttachments(),
        metadata: enhancedMetadata
      });
      
      console.log(`Saved enhanced trace ${trace.traceId} to database with full metrics`);
    } catch (error) {
      console.error("Error saving trace to database:", error);
    }
  }
  
  /**
   * Find the last used model in the conversation
   * This helps ensure we have a model recorded for analytics
   */
  private findLastUsedModel(): string {
    // First try to find from assistant messages
    for (let i = this.state.messages.length - 1; i >= 0; i--) {
      const message = this.state.messages[i];
      if (message.role === 'assistant' && message.modelUsed) {
        return message.modelUsed;
      }
    }
    
    // Fallback to check trace events
    const currentTrace = this.traceManager.getCurrentTrace();
    if (currentTrace && currentTrace.events) {
      for (let i = currentTrace.events.length - 1; i >= 0; i--) {
        const event = currentTrace.events[i];
        if (event.eventType === 'model_used' && event.data.model) {
          return event.data.model;
        }
      }
    }
    
    // Return default model based on config
    return this.config.usePerformanceModel ? 'gpt-4o-mini' : 'gpt-4o';
  }
}
