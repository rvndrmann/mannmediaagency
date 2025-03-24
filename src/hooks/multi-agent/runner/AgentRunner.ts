
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { AgentType, BUILT_IN_AGENT_TYPES } from "@/hooks/use-multi-agent-chat";
import { Attachment, Command, Message, Task } from "@/types/message";
import { RunConfig, RunEvent, RunHooks, RunResult, RunState, RunStatus, TraceManager, Trace, ToolContext, ToolResult } from "../types";
import { parseToolCommand } from "../tool-parser";
import { toolExecutor } from "../tool-executor";
import { getToolsForLLM } from "../tools";
import { toast } from "sonner";

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
  private userAgentInstructions: Record<string, string> | null;
  private userCredits: number = 0;
  
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
    
    // Load user-edited instructions from localStorage
    this.userAgentInstructions = this.loadUserAgentInstructions();
  }
  
  /**
   * Load user-edited instructions from localStorage
   */
  private loadUserAgentInstructions(): Record<string, string> | null {
    try {
      const savedInstructions = localStorage.getItem('built_in_agent_instructions');
      return savedInstructions ? JSON.parse(savedInstructions) : null;
    } catch (e) {
      console.error("Error loading agent instructions from localStorage:", e);
      return null;
    }
  }
  
  /**
   * Get the current agent's instructions
   */
  private getCurrentAgentInstructions(): string | null {
    const agentType = this.state.currentAgentType;
    
    // For custom agents, we'll get instructions from the database via the edge function
    if (this.state.isCustomAgent) {
      return null;
    }
    
    // For built-in agents, get the user-edited version if available
    if (this.userAgentInstructions && this.userAgentInstructions[agentType]) {
      return this.userAgentInstructions[agentType];
    }
    
    return null;
  }
  
  /**
   * Get system prompts for all agent types
   */
  private getDefaultSystemPrompt(agentType: string): string {
    switch(agentType) {
      case "main":
        return "You are a general-purpose AI assistant. You are helpful, creative, clever, and friendly.";
      case "script":
        return "You are a script writer. You write scripts, dialogue, and stories.";
      case "image":
        return "You are an image prompt generator. You create detailed prompts for AI image generation.";
      case "tool":
        return "You are a tool orchestrator. You help the user use tools to accomplish tasks.";
      case "scene":
        return "You are a scene description generator. You create vivid scene descriptions for visual content.";
      case "browser":
        return "You are a browser automation specialist. You help the user automate browser tasks.";
      case "product-video":
        return "You are a product video creator. You help the user create professional product videos.";
      case "custom-video":
        return "You are a custom video request agent. You help the user submit requests for custom videos.";
      default:
        return "You are a general-purpose AI assistant. You are helpful, creative, clever, and friendly.";
    }
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
      // Check credits and store the user's credit balance
      if (userId) {
        const hasCredits = await this.checkCredits(userId);
        if (!hasCredits) {
          this.recordTraceEvent("error", "Insufficient credits");
          throw new Error("Insufficient credits");
        }
      }
      
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
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
          if (trace.summary) {
            trace.summary.success = false;
          }
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
   * Check if the user has enough credits
   */
  private async checkCredits(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", userId)
        .single();
      
      if (error) throw error;
      
      // Store the user's credits for later use in tool execution
      this.userCredits = data.credits_remaining;
      
      return data.credits_remaining >= CHAT_CREDIT_COST;
    } catch (error) {
      console.error("Error checking credits:", error);
      return false;
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
      id: uuidv4(),
      role: "assistant",
      content: "Processing your request...",
      status: "thinking",
      agentType: this.state.currentAgentType,
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: uuidv4(),
          name: `Consulting ${this.state.currentAgentType} agent`,
          status: "pending"
        },
        {
          id: uuidv4(),
          name: "Preparing response",
          status: "pending"
        }
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
    
    // Get the current agent's instructions
    const userInstructions = this.getCurrentAgentInstructions();
    
    console.log(`Sending user instructions for ${this.state.currentAgentType}: ${userInstructions ? 'Yes' : 'No'}`);
    if (userInstructions) {
      console.log(`Instruction length: ${userInstructions.length} characters`);
    }
    
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
          traceId: this.traceManager.getCurrentTrace()?.traceId,
          userInstructions: userInstructions
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
      description: `Running ${command.feature} tool`,
      status: "pending" as Task["status"]
    };
    
    this.updateMessage(this.state.lastMessageIndex, {
      tasks: [...(this.state.messages[this.state.lastMessageIndex].tasks || []), toolTask]
    });
    
    try {
      // Set up tool context with the user's credits
      const toolContext: ToolContext = {
        userId: this.userId || "",
        creditsRemaining: this.userCredits, // Pass the actual credits
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
      id: uuidv4(),
      role: "assistant",
      content: `I'm transferring you to the ${targetAgent} agent for better assistance.\n\nReason: ${reason}`,
      status: "completed",
      agentType: this.state.currentAgentType,
      createdAt: new Date().toISOString(),
      tasks: [{
        id: uuidv4(),
        name: `Transferring to ${targetAgent} agent`,
        description: `Handoff to ${targetAgent}`,
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
  
  /**
   * Emit an event to the hooks
   */
  private emitEvent(event: RunEvent) {
    if (this.hooks.onEvent) {
      this.hooks.onEvent(event);
    }
  }
  
  /**
   * Create a new task
   */
  private createTask(name: string): Task {
    return {
      id: uuidv4(),
      name,
      description: name,
      status: "pending"
    };
  }
  
  /**
   * Update a task's status
   */
  private updateTaskStatus(index: number, status: Task["status"], details?: string) {
    if (this.state.messages[this.state.lastMessageIndex].tasks) {
      this.state.messages[this.state.lastMessageIndex].tasks[index].status = status;
      if (details) {
        this.state.messages[this.state.lastMessageIndex].tasks[index].details = details;
      }
    }
  }
  
  /**
   * Update a message
   */
  private updateMessage(index: number, updates: Partial<Message>) {
    this.state.messages[index] = {
      ...this.state.messages[index],
      ...updates
    };
  }
  
  /**
   * Format messages for the API
   */
  private formatMessages() {
    return this.state.messages.map(m => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments,
      handoffRequest: m.handoffRequest,
      command: m.command,
      modelUsed: m.modelUsed,
      status: m.status,
      agentType: m.agentType,
      tasks: m.tasks
    }));
  }
  
  /**
   * Check if there are any attachments
   */
  private hasAttachments(): boolean {
    return this.state.messages.some(m => m.attachments && m.attachments.length > 0);
  }
  
  /**
   * Get attachment types
   */
  private getAttachmentTypes(): string[] {
    return this.state.messages.flatMap(m => m.attachments?.map(a => a.type) || []);
  }
  
  /**
   * Get all attachments
   */
  private getAttachments(): Attachment[] {
    return this.state.messages.flatMap(m => m.attachments || []);
  }
  
  /**
   * Save trace to database
   */
  private async saveTraceToDatabase(trace: Trace) {
    try {
      // For now, let's just log the trace to console
      console.log("Would save trace to database:", trace);
      // We'll implement the actual database saving once we have a proper table structure
      // await supabase.from("agent_traces").insert(trace);
    } catch (error) {
      console.error("Error saving trace:", error);
    }
  }
  
  /**
   * Record a trace event
   */
  private recordTraceEvent(eventType: string, eventData: any) {
    if (this.traceManager.isTracingEnabled()) {
      this.traceManager.recordEvent(eventType, eventData);
    }
  }
}
