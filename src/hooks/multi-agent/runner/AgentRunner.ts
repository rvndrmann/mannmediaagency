import { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/components/ui/use-toast";
import { useCompletion } from 'ai/react';
import { ChatMessage } from "@/types";
import { createAgent, AgentExecutor } from "./Agent";
import { executeTool } from "./ToolExecutor";
import { AgentType, Environment } from "../types";
// Import the createTraceEvent and saveTrace functions correctly
import { createTraceEvent, saveTrace, Trace } from "@/lib/trace-utils";

interface AgentRunnerProps {
  task: string;
  userId: string;
  sessionId: string;
  environment: Environment;
  initialAgentType?: AgentType;
  onData: (data: string) => void;
  onMessages: (messages: ChatMessage[]) => void;
  onAgentTypeChange: (agentType: AgentType) => void;
  onTraceId: (traceId: string) => void;
  onIsRunning: (isRunning: boolean) => void;
}

export const useAgentRunner = ({
  task,
  userId,
  sessionId,
  environment,
  initialAgentType = AgentType.CREATIVE,
  onData,
  onMessages,
  onAgentTypeChange,
  onTraceId,
  onIsRunning
}: AgentRunnerProps) => {
  const [agentType, setAgentType] = useState<AgentType>(initialAgentType);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { complete, completion, setCompletion } = useCompletion({
    api: '/api/completion'
  });
  const agentExecutorRef = useRef<AgentExecutor | null>(null);
  
  // Initialize trace when the component mounts
  useEffect(() => {
    const initializeTrace = async () => {
      const newTrace = {
        id: uuidv4(),
        name: 'Agent Run',
        start_time: new Date().toISOString(),
        end_time: null,
        events: [],
        metadata: {
          task: task,
          userId: userId,
          sessionId: sessionId,
          environment: environment,
          agentType: agentType
        }
      };
      setTrace(newTrace);
      setTraceId(newTrace.id);
      onTraceId(newTrace.id);
    };
    
    initializeTrace();
  }, []);
  
  // Save trace to database when it changes
  useEffect(() => {
    if (trace) {
      saveTraceToDatabase(trace);
    }
  }, [trace]);
  
  // Update agent type and persist to local storage
  const handleAgentTypeChange = useCallback((newAgentType: AgentType) => {
    setAgentType(newAgentType);
    onAgentTypeChange(newAgentType);
  }, [onAgentTypeChange]);
  
  // Function to add a message to the chat
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prevMessages) => [...prevMessages, message]);
    onMessages([...messages, message]);
  }, [messages, onMessages]);
  
  // Save trace to database
  async function saveTraceToDatabase(trace: Trace): Promise<void> {
    try {
      // Convert the trace object to match the expected format
      const traceData = {
        id: trace.id,
        name: trace.name,
        start_time: trace.start_time,
        end_time: trace.end_time,
        events: trace.events,
        metadata: trace.metadata
      };
      
      await saveTrace(traceData);
    } catch (error) {
      console.error("Failed to save trace:", error);
    }
  }
  
  // Function to update the trace with a new event
  const updateTrace = useCallback((event: any) => {
    setTrace((prevTrace: any) => {
      if (!prevTrace) return prevTrace;
      
      const updatedTrace = {
        ...prevTrace,
        events: [...prevTrace.events, event],
      };
      
      return updatedTrace;
    });
  }, []);
  
  // Start the agent run
  const startAgent = useCallback(async () => {
    if (!task || !userId || !sessionId || !environment) {
      console.error("Missing required parameters to start agent");
      toast({
        title: "Missing Parameters",
        description: "Please provide all required parameters to start the agent.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRunning(true);
    onIsRunning(true);
    setError(null);
    setCompletion('');
    setMessages([]);
    
    try {
      // Create a new agent
      const agent = createAgent(agentType, environment);
      agentExecutorRef.current = new AgentExecutor(agent);
      
      // Add initial message
      addMessage({
        id: uuidv4(),
        type: "user",
        text: task,
        timestamp: new Date().toISOString()
      });
      
      // Start the agent loop
      let agentResponse = null;
      let step = 0;
      
      while (step < 20) {
        step++;
        
        // Create trace event for the step
        const stepTraceEvent = createTraceEvent('step', { step }, traceId);
        updateTrace(stepTraceEvent);
        
        // Get agent's response
        agentResponse = await agentExecutorRef.current.step(task, messages, async (toolName: string, parameters: any) => {
          // Create trace event for the tool call
          const toolCallTraceEvent = createTraceEvent('tool_call', { toolName, parameters }, traceId);
          updateTrace(toolCallTraceEvent);
          
          // Execute the tool
          return await executeTool(toolName, parameters, { userId, sessionId, traceId });
        });
        
        if (!agentResponse) {
          throw new Error("Agent returned null response");
        }
        
        // Add agent's response to messages
        addMessage({
          id: uuidv4(),
          type: "system",
          text: agentResponse.output,
          timestamp: new Date().toISOString()
        });
        
        // Update the completion
        setCompletion(agentResponse.output);
        onData(agentResponse.output);
        
        // If the agent finished, break the loop
        if (agentResponse.done) {
          break;
        }
      }
      
      // If the agent didn't finish in 20 steps, show a warning
      if (!agentResponse?.done) {
        toast({
          title: "Agent Run Warning",
          description: "Agent run did not complete within 20 steps.",
          variant: "warning",
        });
      }
      
      // Complete the trace
      setTrace((prevTrace: any) => {
        if (!prevTrace) return prevTrace;
        
        const completedTrace = {
          ...prevTrace,
          end_time: new Date().toISOString(),
          metadata: {
            ...prevTrace.metadata,
            success: true
          }
        };
        
        return completedTrace;
      });
    } catch (e: any) {
      console.error("Error in agent run:", e);
      setError(e.message || "Unknown error occurred");
      
      // Add error message
      addMessage({
        id: uuidv4(),
        type: "error",
        text: e.message || "Unknown error occurred",
        timestamp: new Date().toISOString()
      });
      
      // Update the trace with the error
      updateTrace(createTraceEvent('error', { error: e.message }, traceId));
      
      // Complete the trace with the error
      setTrace((prevTrace: any) => {
        if (!prevTrace) return prevTrace;
        
        const completedTrace = {
          ...prevTrace,
          end_time: new Date().toISOString(),
          metadata: {
            ...prevTrace.metadata,
            success: false,
            error: e.message
          }
        };
        
        return completedTrace;
      });
      
      toast({
        title: "Error",
        description: e.message || "An error occurred during the agent run.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      onIsRunning(false);
    }
  }, [task, userId, sessionId, environment, agentType, addMessage, toast, updateTrace, onIsRunning]);
  
  return {
    agentType,
    messages,
    completion,
    traceId,
    isRunning,
    error,
    handleAgentTypeChange,
    startAgent
  };
};
