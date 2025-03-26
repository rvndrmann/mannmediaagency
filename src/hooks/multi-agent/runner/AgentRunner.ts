
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/components/ui/use-toast";
import { createTrace, createTraceEvent, TraceEventType } from "@/lib/trace-utils";
import { AgentType } from "@/hooks/use-multi-agent-chat";

// Define missing types
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
  initialAgentType = "main",
  onData,
  onMessages,
  onAgentTypeChange,
  onTraceId,
  onIsRunning
}: {
  task: string;
  userId: string;
  sessionId: string;
  environment: any;
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
  const initializeTrace = useCallback(() => {
    const trace = createTrace('Agent Run');
    setTraceId(trace.id);
    onTraceId(trace.id);
    return trace.id;
  }, [onTraceId]);
  
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
    if (!task || !userId || !sessionId) {
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
    
    // Initialize a new trace
    const newTraceId = initializeTrace();
    
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
      
      // Create trace event for the user message
      const thinkingEvent = createTraceEvent(
        TraceEventType.THINKING,
        { agentType, prompt: task }
      );
      console.log("Created thinking event:", thinkingEvent);
      
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
      const successEvent = createTraceEvent(
        TraceEventType.MESSAGE,
        { output: simulatedResponse }
      );
      console.log("Created success event:", successEvent);
      
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
  }, [task, userId, sessionId, agentType, initializeTrace, addMessage, onData, toast, onIsRunning]);
  
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
