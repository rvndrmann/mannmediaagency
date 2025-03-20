import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Agent, Message, Task } from "@/types/message";
import { useCompletion } from "../use-completion";
import { useTools } from "../use-tools";
import { ToolResult } from "../types";

interface AgentRunnerProps {
  agent: Agent;
  initialMessage: string;
  onNewMessage: (message: Message) => void;
  onUpdateMessage: (id: string, updates: Partial<Message>) => void;
  onAgentStatusUpdate: (agentId: string, status: 'waiting' | 'running' | 'completed' | 'error') => void;
  allMessages: Message[];
}

export const useAgentRunner = ({
  agent,
  initialMessage,
  onNewMessage,
  onUpdateMessage,
  onAgentStatusUpdate,
  allMessages,
}: AgentRunnerProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { getCompletion } = useCompletion();
  const { executeTool } = useTools();

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    const newMessage: Message = { ...message, id: uuidv4() };
    onNewMessage(newMessage);
    return newMessage;
  }, [onNewMessage]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === taskId ? { ...task, ...updates } : task))
    );
  }, []);

  const runAgent = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    onAgentStatusUpdate(agent.id, 'running');

    try {
      // Initial Agent Message
      const initialAgentMessage = addMessage({
        agentId: agent.id,
        content: initialMessage,
        role: 'user',
        createdAt: new Date(),
      });

      let currentMessage = initialAgentMessage;
      let loopCount = 0;

      while (currentMessage.role !== 'assistant' && loopCount < 10) {
        loopCount++;
        // Get Completion
        const completion = await getCompletion(agent, allMessages);

        if (!completion) {
          console.error("Completion failed, stopping agent.");
          onUpdateMessage(currentMessage.id, {
            content: `${currentMessage.content}\n\n**Error:** Completion failed.`,
          });
          onAgentStatusUpdate(agent.id, 'error');
          break;
        }

        // Add Assistant Message
        const assistantMessage = addMessage({
          agentId: agent.id,
          content: completion.content,
          role: 'assistant',
          createdAt: new Date(),
          command: completion.command,
          tasks: completion.tasks,
        });

        // Update tasks
        if (completion.tasks) {
          setTasks(completion.tasks);
        }

        // Check if tool execution is needed
        if (completion.command) {
          const { name, parameters } = completion.command;
          console.log(`Executing tool: ${name} with params:`, parameters);

          // Update the task status to running
          if (completion.tasks && completion.tasks.length > 0) {
            completion.tasks.forEach(task => {
              updateTask(task.id, { status: 'running' });
            });
          }

          // Execute tool
          const toolResult: ToolResult | null = await executeTool(name, parameters);

          if (toolResult) {
            // Update the task status to completed
            if (completion.tasks && completion.tasks.length > 0) {
              completion.tasks.forEach(task => {
                updateTask(task.id, { status: 'completed' });
              });
            }

            // Update assistant message with tool result
            const updatedContent = `${assistantMessage.content}\n\n${toolResult.content}`;
            onUpdateMessage(assistantMessage.id, {
              content: updatedContent,
              tasks: completion.tasks?.map(task => ({ ...task, status: 'completed' }))
            });

            // Set the current message to the updated assistant message for the next iteration
            currentMessage = { ...assistantMessage, content: updatedContent };
          } else {
            // Tool execution failed
            console.error(`Tool execution failed for: ${name}`);
            onUpdateMessage(assistantMessage.id, {
              content: `${assistantMessage.content}\n\n**Error:** Tool execution failed.`,
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
    addMessage,
    onUpdateMessage,
    onAgentStatusUpdate,
    allMessages,
    updateTask
  ]);

  useEffect(() => {
    if (agent.autoRun) {
      runAgent();
    }
  }, [agent.autoRun, runAgent]);

  // Function to determine if a task is the last completed task
  const isLastCompletedTask = useCallback((taskId: string) => {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length === 0) return false;

    const lastItem = completedTasks[completedTasks.length - 1];
    const status = tasks.find(task => task.id === taskId)?.status;

    if (status === "running" && lastItem?.status === "completed" as any) {
      return lastItem.id === taskId;
    }

    return false;
  }, [tasks]);

  return {
    tasks,
    isRunning,
    runAgent,
    isLastCompletedTask,
  };
};
