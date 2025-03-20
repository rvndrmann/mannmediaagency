
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Attachment, Command, Message, Task } from "@/types/message";
import { RunConfig, RunEvent, RunHooks, RunResult, RunState, RunStatus } from "./types";
import { parseToolCommand } from "../tool-parser";
import { toolExecutor } from "../tool-executor";
import { getToolsForLLM } from "../tools";
import { ToolContext, ToolResult } from "../types";
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
      status: "pending",
      lastMessageIndex: -1
    };
    
    this.config = {
      maxTurns: DEFAULT_MAX_TURNS,
      usePerformanceModel: false,
      tracingDisabled: false,
      ...config,
      runId: config.runId || uuidv4()
    };
    
    this.hooks = hooks;
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
    
    try {
      // Check credits
      if (userId) {
        const hasCredits = await this.checkCredits(userId);
        if (!hasCredits) {
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
      
      // Start the run loop
      this.state.status = "running";
      await this.runLoop();
      
      // Build result
      const result: RunResult = {
        state: this.state,
        output: this.state.messages,
        success: this.state.status === "completed",
        metrics: {
          totalDuration: 0, // TODO: Track duration
          turnCount: this.state.turnCount,
          toolCalls: 0, // TODO: Track tool calls
          handoffs: 0  // TODO: Track handoffs
        }
      };
      
      this.emitEvent({ type: "completed", result });
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.state.status = "error";
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
    while (this.state.status === "running" && 
           this.state.turnCount < (this.config.maxTurns || DEFAULT_MAX_TURNS)) {
      
      this.state.turnCount++;
      
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
      
      // No more actions needed, complete the run
      this.state.status = "completed";
      break;
    }
    
    if (this.state.turnCount >= (this.config.maxTurns || DEFAULT_MAX_TURNS)) {
      throw new Error("Maximum turns exceeded");
    }
  }
  
  /**
   * Execute a single turn with the current agent
   */
  private async executeTurn() {
    this.emitEvent({ type: "thinking", agentType: this.state.currentAgentType });
    
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
      
      // Update tasks
      this.updateTaskStatus(0, "completed");
      this.updateTaskStatus(1, "in-progress");
      
      // Parse response
      const toolCommand = this.state.currentAgentType === "tool" ? 
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
    
    const response = await supabase.functions.invoke("multi-agent-chat", {
      body: {
        messages: this.formatMessages(),
        agentType: this.state.currentAgentType,
        userId: user.id,
        contextData: {
          hasAttachments: this.hasAttachments(),
          attachmentTypes: this.getAttachmentTypes(),
          availableTools: this.state.currentAgentType === "tool" ? 
            getToolsForLLM() : undefined,
          usePerformanceModel: this.config.usePerformanceModel,
          isHandoffContinuation: this.state.handoffInProgress
        }
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message || "Failed to get response from agent");
    }
    
    return response.data;
  }
  
  /**
   * Execute a tool command
   */
  private async executeToolCommand(command: Command) {
    this.emitEvent({ type: "tool_start", command });
    
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
      
      // Execute tool
      const result = await toolExecutor.executeCommand(command, toolContext);
      this.emitEvent({ type: "tool_end", result });
      
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
  
  private async executeTurn() {
    this.emitEvent({ type: "thinking", agentType: this.state.currentAgentType });
    
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
      
      // Update tasks
      this.updateTaskStatus(0, "completed");
      this.updateTaskStatus(1, "in-progress");
      
      // Parse response
      const toolCommand = this.state.currentAgentType === "tool" ? 
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
  
  private async getAgentResponse() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const response = await supabase.functions.invoke("multi-agent-chat", {
      body: {
        messages: this.formatMessages(),
        agentType: this.state.currentAgentType,
        userId: user.id,
        contextData: {
          hasAttachments: this.hasAttachments(),
          attachmentTypes: this.getAttachmentTypes(),
          availableTools: this.state.currentAgentType === "tool" ? 
            getToolsForLLM() : undefined,
          usePerformanceModel: this.config.usePerformanceModel,
          isHandoffContinuation: this.state.handoffInProgress
        }
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message || "Failed to get response from agent");
    }
    
    return response.data;
  }
  
  private async executeToolCommand(command: Command) {
    this.emitEvent({ type: "tool_start", command });
    
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
      
      // Execute tool
      const result = await toolExecutor.executeCommand(command, toolContext);
      this.emitEvent({ type: "tool_end", result });
      
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
  
  private async handleHandoff(targetAgent: AgentType, reason: string) {
    this.emitEvent({ 
      type: "handoff_start", 
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
    
    this.emitEvent({ type: "handoff_end", to: targetAgent });
    
    toast.info(`Transferred to ${targetAgent} agent for better assistance.`);
  }
}
