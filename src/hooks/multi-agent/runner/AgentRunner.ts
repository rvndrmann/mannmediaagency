
// Fix the import to use the proper types
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Message, Attachment } from "@/types/message";
import { RunConfig, RunHooks, RunState, RunStatus } from "./types";
import { ToolContext, ToolResult } from "@/hooks/types";

export class AgentRunner {
  private config: RunConfig;
  private hooks: RunHooks;
  private agentType: AgentType;
  private state: RunState;

  constructor(agentType: AgentType, config: RunConfig = {}, hooks: RunHooks = {}) {
    this.agentType = agentType;
    this.config = {
      usePerformanceModel: false,
      maxTurns: 10,
      tracingDisabled: false,
      enableDirectToolExecution: true,
      ...config
    };
    this.hooks = hooks;
    this.state = {
      currentAgentType: agentType,
      messages: [],
      handoffInProgress: false,
      turnCount: 0,
      status: "pending",
      lastMessageIndex: -1,
      enableDirectToolExecution: this.config.enableDirectToolExecution
    };
  }

  async run(input: string, attachments: Attachment[] = [], userId: string): Promise<void> {
    try {
      if (this.state.status === "running") {
        throw new Error("Agent is already running");
      }

      this.setState("running");
      
      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        attachments: attachments || [],
        timestamp: new Date().toISOString()
      };

      // Add to messages array
      this.state.messages.push(userMessage);
      
      // Initialize tool context
      this.state.toolContext = {
        userId,
        conversationId: this.config.groupId || "default",
        messageHistory: this.state.messages
      };

      // Notify thinking state
      if (this.hooks.onThinking) {
        this.hooks.onThinking(this.state.currentAgentType);
      }

      // Simulate response - in a real implementation this would call an API
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `This is a simulated response from the ${this.state.currentAgentType} agent.`,
        timestamp: new Date().toISOString()
      };

      // Add assistant message to state
      this.state.messages.push(assistantMessage);
      
      // Notify of new message
      if (this.hooks.onMessage) {
        this.hooks.onMessage(assistantMessage);
      }

      // Update state
      this.state.lastMessageIndex = this.state.messages.length - 1;
      this.state.turnCount++;
      
      // Check if we've reached the maximum number of turns
      if (this.state.turnCount >= (this.config.maxTurns || 10)) {
        this.setState("completed");
        // Notify completion
        if (this.hooks.onCompleted) {
          this.hooks.onCompleted({
            state: this.state,
            output: this.state.messages,
            success: true
          });
        }
      } else {
        this.setState("completed");
        // Notify completion
        if (this.hooks.onCompleted) {
          this.hooks.onCompleted({
            state: this.state,
            output: this.state.messages,
            success: true
          });
        }
      }
    } catch (error) {
      // Handle errors
      this.setState("error");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (this.hooks.onError) {
        this.hooks.onError(errorMessage);
      }
    }
  }

  private setState(status: RunStatus): void {
    this.state.status = status;
  }
}
