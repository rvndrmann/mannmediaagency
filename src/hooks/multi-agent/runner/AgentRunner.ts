import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Message, Attachment, Command } from "@/types/message";
import { toolExecutor } from "../tool-executor";
import { v4 as uuidv4 } from "uuid";
import { detectToolCommand } from "../tool-parser";
import { 
  RunConfig, RunEvent, RunHooks, RunResult, 
  RunState, RunStatus, TraceManager, Trace,
  ToolContext, ToolResult
} from "../types";
import { MultiAgentApiClient } from "../api-client";
import { getAllTools } from "../tools";

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

  async run(userInput: string, attachments?: Attachment[], userId?: string): Promise<RunResult> {
    try {
      if (this.traceManager.isTracingEnabled() && userId) {
        this.currentTrace = this.traceManager.startTrace(
          userId,
          this.config.runId
        );
      }

      this.state.status = "running";
      this.state.currentAgentType = this.agentType;
      this.state.messages = [];
      this.state.turnCount = 0;
      
      if (userId && this.state.toolContext) {
        this.state.toolContext.userId = userId;
      }

      const userMessage: Message = {
        role: "user",
        content: userInput,
        attachments
      };
      
      this.state.messages.push(userMessage);
      
      this.emitEvent({
        type: "thinking",
        agentType: this.state.currentAgentType
      });
      
      const response = await this.callAgentAPI(userInput, attachments);
      this.state.messages.push(response);
      
      this.emitEvent({
        type: "message",
        message: response
      });
      
      if (response.command) {
        await this.processCommand(response.command);
      }
      
      if (response.handoffRequest) {
        await this.handleHandoff(response.handoffRequest.targetAgent, response.handoffRequest.reason);
      }
      
      if (this.traceManager.isTracingEnabled() && this.currentTrace) {
        this.traceManager.finishTrace();
      }
      
      this.state.status = "completed";
      
      return {
        state: this.state,
        output: this.state.messages,
        success: true,
        metrics: {
          totalDuration: 0,
          turnCount: this.state.turnCount,
          toolCalls: 0,
          handoffs: 0,
          messageCount: this.state.messages.length
        }
      };
      
    } catch (error) {
      console.error("Agent run error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      this.emitEvent({
        type: "error",
        error: errorMessage
      });
      
      this.state.status = "error";
      
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
  
  private async callAgentAPI(
    userInput: string,
    attachments?: Attachment[]
  ): Promise<Message> {
    try {
      this.state.turnCount++;
      
      if (this.state.messages.length === 0) {
        return {
          role: "assistant",
          content: `I am the ${this.state.currentAgentType} agent. How can I help you?`,
          agentType: this.state.currentAgentType
        };
      }
      
      const messagesWithAttachments = MultiAgentApiClient.formatAttachments([...this.state.messages]);
      
      const availableTools = this.state.currentAgentType === 'tool' ? getAllTools() : [];
      
      const isCustomAgent = this.state.isCustomAgent || false;
      
      const hasAttachments = !!attachments && attachments.length > 0;
      const attachmentTypes = hasAttachments 
        ? MultiAgentApiClient.getAttachmentTypes(messagesWithAttachments)
        : [];
      
      const { completion, handoffRequest, modelUsed } = await MultiAgentApiClient.callAgent(
        messagesWithAttachments,
        this.state.currentAgentType,
        {
          usePerformanceModel: !!this.config.usePerformanceModel,
          hasAttachments,
          attachmentTypes,
          isCustomAgent,
          isHandoffContinuation: this.state.handoffInProgress,
          enableDirectToolExecution: !!this.state.enableDirectToolExecution,
          availableTools,
          traceId: this.currentTrace?.traceId,
          userId: this.state.toolContext?.userId
        }
      );
      
      const commandMatch = completion.match(/TOOL: ([a-zA-Z0-9-_]+), PARAMETERS: ({.*})/i);
      let command: Command | null = null;
      
      if (commandMatch && commandMatch.length >= 3) {
        try {
          const toolName = commandMatch[1].trim();
          const params = JSON.parse(commandMatch[2]);
          
          command = {
            feature: toolName as any,
            action: "create",
            parameters: params,
            confidence: 1.0,
            type: "standard",
            tool: toolName
          };
        } catch (error) {
          console.error("Error parsing tool command:", error);
        }
      } else {
        const firstLine = completion.trim().split('\n')[0];
        command = detectToolCommand(firstLine);
      }
      
      return {
        role: "assistant",
        content: completion,
        agentType: this.state.currentAgentType,
        command,
        handoffRequest,
        modelUsed
      };
    } catch (error) {
      console.error("Error calling agent API:", error);
      throw new Error(`Failed to get response from ${this.state.currentAgentType} agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async processCommand(command: Command): Promise<ToolResult> {
    this.emitEvent({
      type: "tool_start",
      command
    });
    
    const result = await toolExecutor.executeCommand(command, this.state.toolContext || { 
      userId: "", 
      creditsRemaining: 0 
    });
    
    this.emitEvent({
      type: "tool_end",
      result
    });
    
    this.state.lastToolResult = result;
    
    return result;
  }
  
  private async handleHandoff(targetAgent: AgentType, reason: string): Promise<void> {
    this.emitEvent({
      type: "handoff_start",
      from: this.state.currentAgentType,
      to: targetAgent,
      reason
    });
    
    this.state.handoffInProgress = true;
    this.state.currentAgentType = targetAgent;
    
    this.emitEvent({
      type: "handoff_end",
      to: targetAgent
    });
  }
  
  private emitEvent(event: RunEvent): void {
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
    
    this.hooks.onEvent?.(event);
    
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
