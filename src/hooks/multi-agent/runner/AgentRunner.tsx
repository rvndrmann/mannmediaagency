
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Attachment, Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect, useCallback } from "react";
import { useCompletion } from "../use-completion";
import { useTools } from "../use-tools";

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

// Define the interface for CompletionResult
interface CompletionResult {
  content: string;
  command?: {
    name: string;
    parameters: Record<string, any>;
  };
  tasks?: any[];
}

export const useAgentRunner = ({ 
  agent, 
  initialMessage, 
  onNewMessage, 
  onUpdateMessage, 
  onAgentStatusUpdate, 
  allMessages 
}) => {
  const [tasks, setTasks] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const { getCompletion } = useCompletion();
  const { executeTool } = useTools();
  
  const isLastCompletedTask = useCallback((taskId) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;
    
    // Check if this is the last task or if all subsequent tasks are completed
    for (let i = taskIndex + 1; i < tasks.length; i++) {
      if (tasks[i].status !== 'completed') return false;
    }
    return true;
  }, [tasks]);
  
  const runAgent = useCallback(async (message, context = {}) => {
    setIsRunning(true);
    try {
      // Process the message with the agent
      // Fixed: Removed the third argument as getCompletion expects only 2 args
      const completion = await getCompletion(agent, message);
      
      // Handle the agent's response
      if (completion) {
        // Create a new message with an ID for tracking
        const newMessage = {
          ...completion,
          id: uuidv4() // Add an ID to the completion result
        };
        
        onNewMessage(newMessage);
        
        // Check for tool calls or handoffs
        // Fixed: Changed completion.command.tool to completion.command.name
        if (completion.command && completion.command.name) {
          // Fixed: Use completion.command.name instead of completion.command.tool
          const toolResult = await executeTool(completion.command.name, completion.command.parameters);
          // Fixed: Use newMessage.id instead of completion.id
          onUpdateMessage(newMessage.id, { status: 'completed' });
          
          // Send tool result back to agent
          return runAgent(`Tool result: ${JSON.stringify(toolResult)}`, {
            previousMessage: newMessage
          });
        }
      }
    } catch (error) {
      console.error("Agent runner error:", error);
      onAgentStatusUpdate('error', error.message);
    } finally {
      setIsRunning(false);
    }
  }, [agent, getCompletion, executeTool, onNewMessage, onUpdateMessage, onAgentStatusUpdate]);
  
  useEffect(() => {
    if (initialMessage && !isRunning) {
      runAgent(initialMessage);
    }
  }, [initialMessage, isRunning, runAgent]);
  
  return {
    tasks,
    isRunning,
    runAgent,
    isLastCompletedTask
  };
};
