
// Only update the specific line that has the invalid toast variant
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/components/ui/use-toast";
import { createTrace, createTraceEvent, saveTrace } from "@/lib/trace-utils";

// Define missing types
type AgentType = string;
type Environment = string;
interface ChatMessage {
  id: string;
  type: string;
  text: string;
  timestamp: string;
}

export const useAgentRunner = ({
  task,
  userId,
  sessionId,
  environment,
  initialAgentType = "CREATIVE",
  onData,
  onMessages,
  onAgentTypeChange,
  onTraceId,
  onIsRunning
}: {
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
}) => {
  const [agentType, setAgentType] = useState<AgentType>(initialAgentType);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [completion, setCompletion] = useState<string>('');
  
  // Initialize trace when the component mounts
  useCallback(() => {
    const initializeTrace = async () => {
      const newTrace = createTrace('Agent Run', {
        task: task,
        userId: userId,
        sessionId: sessionId,
        environment: environment,
        agentType: agentType
      });
      setTraceId(newTrace.id);
      onTraceId(newTrace.id);
    };
    
    initializeTrace();
  }, [task, userId, sessionId, environment, agentType, onTraceId]);
  
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
      // Simulated agent response
      const simulatedResponse = `This is a placeholder response for "${task}". The actual agent implementation will be added in a future update.`;
      
      // Add user message
      addMessage({
        id: uuidv4(),
        type: "user",
        text: task,
        timestamp: new Date().toISOString()
      });
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add agent's response
      addMessage({
        id: uuidv4(),
        type: "system",
        text: simulatedResponse,
        timestamp: new Date().toISOString()
      });
      
      // Update the completion
      setCompletion(simulatedResponse);
      onData(simulatedResponse);
      
      // Create trace event for the successful run
      const successEvent = createTraceEvent('completed', { output: simulatedResponse }, traceId || undefined);
      console.log("Created trace event:", successEvent);
      
      // Log success
      console.log("Agent run completed successfully");
      
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
      
      toast({
        title: "Error",
        description: e.message || "An error occurred during the agent run.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      onIsRunning(false);
    }
  }, [task, userId, sessionId, environment, traceId, onData, addMessage, toast, onIsRunning]);
  
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
