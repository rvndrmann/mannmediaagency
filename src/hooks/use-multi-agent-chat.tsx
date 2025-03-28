
import { useState, useCallback, useEffect } from "react";
import { Message, Attachment } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AgentType } from "./multi-agent/runner/types";

// Export AgentType to make it available to other modules
export type { AgentType } from "./multi-agent/runner/types";

interface UseMultiAgentChatOptions {
  initialMessages?: Message[];
  onAgentSwitch?: (from: string, to: string) => void;
}

export function useMultiAgentChat(options: UseMultiAgentChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || []);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>({ credits_remaining: 100 });
  const [usePerformanceModel, setUsePerformanceModel] = useState<boolean>(false);
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState<boolean>(false);
  const [tracingEnabled, setTracingEnabled] = useState<boolean>(false);
  const [handoffInProgress, setHandoffInProgress] = useState<boolean>(false);
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({
    main: "You are a helpful AI assistant focused on general tasks.",
    script: "You specialize in writing scripts and creative content.",
    image: "You specialize in creating detailed image prompts.",
    tool: "You specialize in executing tools and technical tasks.",
    scene: "You specialize in creating detailed visual scene descriptions."
  });
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    if (!input.trim() && pendingAttachments.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }
    
    await sendMessage(input);
    setInput("");
    setPendingAttachments([]);
  };
  
  // Switch between different agent types
  const switchAgent = (agentId: AgentType) => {
    if (options.onAgentSwitch) {
      options.onAgentSwitch(activeAgent, agentId);
    }
    setActiveAgent(agentId);
    toast.success(`Switched to ${getAgentName(agentId)}`);
  };
  
  // Get agent name for display
  const getAgentName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      default: return "Assistant";
    }
  };
  
  // Clear chat history
  const clearChat = () => {
    setMessages([]);
  };
  
  // Add attachments
  const addAttachments = (newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  };
  
  // Remove attachment by id
  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };
  
  // Update agent instructions
  const updateAgentInstructions = (agentType: AgentType, instructions: string) => {
    setAgentInstructions(prev => ({
      ...prev,
      [agentType]: instructions
    }));
    toast.success(`Updated ${getAgentName(agentType)} instructions`);
  };
  
  // Get instructions for a specific agent
  const getAgentInstructions = (agentType: AgentType): string => {
    return agentInstructions[agentType] || "";
  };
  
  // Toggle performance mode (GPT-4o-mini vs GPT-4o)
  const togglePerformanceMode = () => {
    setUsePerformanceModel(!usePerformanceModel);
    toast.success(`Switched to ${!usePerformanceModel ? "Performance" : "High Quality"} mode`);
  };
  
  // Toggle direct tool execution
  const toggleDirectToolExecution = () => {
    setEnableDirectToolExecution(!enableDirectToolExecution);
    toast.success(`${!enableDirectToolExecution ? "Enabled" : "Disabled"} direct tool execution`);
  };
  
  // Toggle tracing
  const toggleTracing = () => {
    setTracingEnabled(!tracingEnabled);
    toast.success(`${!tracingEnabled ? "Enabled" : "Disabled"} interaction tracing`);
  };
  
  // Simulate a handoff between agents
  const simulateHandoff = (fromAgent: AgentType, toAgent: AgentType, reason: string) => {
    setHandoffInProgress(true);
    
    setTimeout(() => {
      switchAgent(toAgent);
      setHandoffInProgress(false);
      
      // Add system message about handoff
      const handoffMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Conversation transferred from ${getAgentName(fromAgent)} to ${getAgentName(toAgent)}. Reason: ${reason}`,
        createdAt: new Date().toISOString(),
        type: "handoff"
      };
      
      setMessages(prev => [...prev, handoffMessage]);
    }, 1500);
  };
  
  // This is the actual message sending function that's exposed
  const sendMessage = async (message: string, agentId?: string) => {
    setIsLoading(true);
    
    try {
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        content: message,
        role: "user",
        createdAt: new Date().toISOString(),
        attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Simulate response
      setTimeout(() => {
        const responseContent = simulateAgentResponse(message, agentId || activeAgent);
        const response: Message = {
          id: uuidv4(),
          content: responseContent.text,
          role: "assistant",
          agentType: agentId || activeAgent,
          createdAt: new Date().toISOString(),
          handoffRequest: responseContent.handoff
        };
        
        setMessages(prev => [...prev, response]);
        
        // Handle handoff if needed
        if (responseContent.handoff) {
          simulateHandoff(
            agentId || activeAgent,
            responseContent.handoff.targetAgent as AgentType,
            responseContent.handoff.reason
          );
        }
        
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error("Error in sendMessage:", error);
      toast.error("Failed to send message");
      setIsLoading(false);
    }
  };
  
  // Simulate different agent responses based on message content
  const simulateAgentResponse = (message: string, agentType: string): { text: string; handoff?: { targetAgent: string; reason: string } } => {
    const lowercaseMessage = message.toLowerCase();
    
    // Check for handoff triggers
    if (agentType === "main" && (lowercaseMessage.includes("write") || lowercaseMessage.includes("script"))) {
      return {
        text: "I see you're asking about writing or scripts. Let me transfer you to our Script Writer agent who specializes in this.",
        handoff: {
          targetAgent: "script",
          reason: "User asked about writing scripts"
        }
      };
    }
    
    if (agentType === "main" && (lowercaseMessage.includes("image") || lowercaseMessage.includes("picture"))) {
      return {
        text: "I see you're asking about images. Let me transfer you to our Image Generator agent who specializes in this.",
        handoff: {
          targetAgent: "image",
          reason: "User asked about image generation"
        }
      };
    }
    
    // Agent-specific responses
    switch (agentType) {
      case "script":
        return {
          text: "As your Script Writer assistant, I can help craft compelling narratives and scripts. What type of content would you like me to create?"
        };
      case "image":
        return {
          text: "As your Image Generator assistant, I can help craft detailed prompts for generating images. What kind of visual would you like to create?"
        };
      case "tool":
        return {
          text: "As your Tool Specialist, I can help you use various tools and APIs. What technical task would you like assistance with?"
        };
      case "scene":
        return {
          text: "As your Scene Creator, I can help craft detailed visual environments. What kind of scene would you like me to describe?"
        };
      default:
        return {
          text: "I'm here to help with any questions or tasks you have. How can I assist you today?"
        };
    }
  };
  
  return {
    messages,
    input,
    setInput,
    isLoading,
    activeAgent,
    userCredits,
    pendingAttachments,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    handoffInProgress,
    agentInstructions,
    handleSubmit,
    switchAgent,
    clearChat: clearChat,
    addAttachments,
    removeAttachment,
    updateAgentInstructions,
    getAgentInstructions,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    sendMessage
  };
}
