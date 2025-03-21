
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Attachment, Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect, useCallback } from "react";
import { useCompletion } from "../use-completion";
import { useTools } from "../use-tools";

// Define CompletionResult interface
interface CompletionResult {
  content: string;
  command?: {
    name: string;
    parameters: Record<string, any>;
  };
  tasks?: any[];
}

// Export the useAgentRunner hook
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
  
  const runAgent = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      // Initial Agent Message
      const initialAgentMessage = {
        id: uuidv4(),
        agentId: agent.id,
        content: initialMessage,
        role: 'user',
        createdAt: new Date(),
      };
      
      onNewMessage(initialAgentMessage);
      
      let currentMessage = initialAgentMessage;
      let loopCount = 0;
      
      while (currentMessage.role !== 'assistant' && loopCount < 10) {
        loopCount++;
        
        // Get Completion - use only 2 arguments as expected
        const completion = await getCompletion(agent, allMessages);
        
        if (!completion) {
          console.error("Completion failed, stopping agent.");
          onUpdateMessage(currentMessage.id, {
            content: `${currentMessage.content}\n\n**Error:** Completion failed.`,
          });
          onAgentStatusUpdate(agent.id, 'error');
          break;
        }
        
        // Add Assistant Message with an ID
        const newMessage = {
          ...completion,
          id: uuidv4(),
          agentId: agent.id,
          role: 'assistant',
          createdAt: new Date(),
        };
        
        onNewMessage(newMessage);
        
        // Check if tool execution is needed
        if (completion.command && completion.command.name) {
          // Use command.name instead of command.tool
          const toolResult = await executeTool(completion.command.name, completion.command.parameters);
          
          // Update the message
          onUpdateMessage(newMessage.id, { status: 'completed' });
          
          // Handle tool result
          if (toolResult) {
            const updatedContent = `${newMessage.content}\n\n${toolResult.content}`;
            onUpdateMessage(newMessage.id, {
              content: updatedContent,
            });
            
            // Set current message for next iteration
            currentMessage = { ...newMessage, content: updatedContent };
          } else {
            console.error(`Tool execution failed for: ${completion.command.name}`);
            onUpdateMessage(newMessage.id, {
              content: `${newMessage.content}\n\n**Error:** Tool execution failed.`,
            });
            onAgentStatusUpdate(agent.id, 'error');
            break;
          }
        } else {
          // No tool execution needed, agent completed its task
          onAgentStatusUpdate(agent.id, 'completed');
          break;
        }
      }
    } catch (error) {
      console.error("Agent run failed:", error);
      onAgentStatusUpdate(agent.id, 'error');
    } finally {
      setIsRunning(false);
      onAgentStatusUpdate(agent.id, 'completed');
    }
  }, [
    agent,
    initialMessage,
    isRunning,
    getCompletion,
    executeTool,
    onNewMessage,
    onUpdateMessage,
    onAgentStatusUpdate,
    allMessages
  ]);
  
  useEffect(() => {
    if (agent.autoRun) {
      runAgent();
    }
  }, [agent.autoRun, runAgent]);
  
  return {
    tasks,
    isRunning,
    runAgent,
    isLastCompletedTask
  };
};
