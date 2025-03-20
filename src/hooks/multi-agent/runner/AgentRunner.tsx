
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Attachment, Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

interface AgentRunnerOptions {
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  tracingDisabled?: boolean;
  metadata?: Record<string, any>;
  runId?: string;
  groupId?: string;
}

interface AgentRunnerHooks {
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
  onHandoffEnd?: (toAgent: AgentType) => void;
}

export class AgentRunner {
  private agentType: AgentType;
  private options: AgentRunnerOptions;
  private hooks: AgentRunnerHooks;
  
  constructor(
    agentType: AgentType,
    options: AgentRunnerOptions = {},
    hooks: AgentRunnerHooks = {}
  ) {
    this.agentType = agentType;
    this.options = options;
    this.hooks = hooks;
  }
  
  async run(
    input: string,
    attachments: Attachment[] = [],
    userId?: string
  ): Promise<void> {
    try {
      // Create a user message
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: input,
        attachments,
        createdAt: new Date()
      };
      
      // Send the user message
      if (this.hooks.onMessage) {
        this.hooks.onMessage(userMessage);
      }
      
      // Simulate a simple agent response (in a real app, this would call an AI model)
      setTimeout(() => {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: `I received your message: "${input}". I'm the ${this.agentType} agent.${attachments.length > 0 ? ' I can see you added some attachments.' : ''}`,
          createdAt: new Date()
        };
        
        if (this.hooks.onMessage) {
          this.hooks.onMessage(assistantMessage);
        }
      }, 1000);
      
    } catch (error) {
      if (this.hooks.onError) {
        this.hooks.onError(error instanceof Error ? error.message : String(error));
      }
    }
  }
}
