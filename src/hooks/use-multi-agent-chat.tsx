
import { useState, useCallback, useEffect } from "react";
import { Message, Attachment } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AgentType } from "@/hooks/multi-agent/runner/types";

// Correctly re-export the type using export type
export type { AgentType } from "@/hooks/multi-agent/runner/types";

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
  
  // Enhanced handoff implementation that preserves context
  const simulateHandoff = (fromAgent: AgentType, toAgent: AgentType, reason: string, preserveFullHistory: boolean = true) => {
    setHandoffInProgress(true);
    
    // Create continuity data to maintain context between agents
    const continuityData = {
      fromAgent,
      toAgent,
      reason,
      timestamp: new Date().toISOString(),
      preserveHistory: preserveFullHistory
    };
    
    setTimeout(() => {
      switchAgent(toAgent);
      setHandoffInProgress(false);
      
      // Add system message about handoff with enhanced context
      const handoffMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Conversation transferred from ${getAgentName(fromAgent)} to ${getAgentName(toAgent)}. Reason: ${reason}`,
        createdAt: new Date().toISOString(),
        type: "handoff",
        continuityData // Add continuity data for context preservation
      };
      
      setMessages(prev => [...prev, handoffMessage]);
    }, 1500);
  };
  
  // Enhanced message sending function with improved context handling
  const sendMessage = async (message: string, agentId?: AgentType) => {
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
      
      // Prepare context data for better agent coordination
      const contextData = {
        instructions: agentInstructions[agentId || activeAgent],
        isHandoffContinuation: false,
        previousAgentType: null,
        handoffReason: "",
        conversationContext: {
          performanceMode: usePerformanceModel,
          directToolExecution: enableDirectToolExecution
        }
      };
      
      // Get recent message history for context
      const recentMessages = messages.slice(-10);
      
      // Call the multi-agent chat edge function (simulated for now)
      setTimeout(() => {
        const responseContent = simulateAgentResponse(message, agentId || activeAgent, contextData, recentMessages);
        const response: Message = {
          id: uuidv4(),
          content: responseContent.text,
          role: "assistant",
          agentType: agentId || activeAgent,
          createdAt: new Date().toISOString(),
          handoffRequest: responseContent.handoff,
          structured_output: responseContent.structured_output
        };
        
        setMessages(prev => [...prev, response]);
        
        // Handle handoff if needed with improved context preservation
        if (responseContent.handoff) {
          simulateHandoff(
            agentId || activeAgent,
            responseContent.handoff.targetAgent as AgentType,
            responseContent.handoff.reason,
            responseContent.handoff.preserveFullHistory
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
  
  // Enhanced agent response simulation with improved context handling
  const simulateAgentResponse = (
    message: string, 
    agentType: string, 
    contextData: any = {}, 
    messageHistory: Message[] = []
  ): { 
    text: string; 
    handoff?: { 
      targetAgent: string; 
      reason: string;
      preserveFullHistory?: boolean; 
    };
    structured_output?: any;
  } => {
    const lowercaseMessage = message.toLowerCase();
    
    // Use message history to make more informed responses
    const hasRecentMessages = messageHistory.length > 0;
    const contextPrefix = hasRecentMessages ? "Based on our conversation, " : "";
    
    // Check for handoff triggers with improved context awareness
    if (agentType === "main" && (lowercaseMessage.includes("write") || lowercaseMessage.includes("script"))) {
      return {
        text: `${contextPrefix}I see you're asking about writing or scripts. Let me transfer you to our Script Writer agent who specializes in this.`,
        handoff: {
          targetAgent: "script",
          reason: "User asked about writing scripts",
          preserveFullHistory: true
        }
      };
    }
    
    if (agentType === "main" && (lowercaseMessage.includes("image") || lowercaseMessage.includes("picture"))) {
      return {
        text: `${contextPrefix}I see you're asking about images. Let me transfer you to our Image Generator agent who specializes in this.`,
        handoff: {
          targetAgent: "image",
          reason: "User asked about image generation",
          preserveFullHistory: true
        }
      };
    }
    
    // Agent-specific responses with improved context awareness
    switch (agentType) {
      case "script":
        return {
          text: `${contextPrefix}As your Script Writer assistant, I can help craft compelling narratives and scripts. What type of content would you like me to create?`,
          structured_output: hasRecentMessages ? { contentType: "script", confidence: 0.9 } : undefined
        };
      case "image":
        return {
          text: `${contextPrefix}As your Image Generator assistant, I can help craft detailed prompts for generating images. What kind of visual would you like to create?`,
          structured_output: hasRecentMessages ? { contentType: "image", confidence: 0.85 } : undefined
        };
      case "tool":
        return {
          text: `${contextPrefix}As your Tool Specialist, I can help you use various tools and APIs. What technical task would you like assistance with?`,
          structured_output: hasRecentMessages ? { contentType: "tool", confidence: 0.95 } : undefined
        };
      case "scene":
        return {
          text: `${contextPrefix}As your Scene Creator, I can help craft detailed visual environments. What kind of scene would you like me to describe?`,
          structured_output: hasRecentMessages ? { contentType: "scene", confidence: 0.88 } : undefined
        };
      default:
        return {
          text: `${contextPrefix}I'm here to help with any questions or tasks you have. How can I assist you today?`
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
    clearChat,
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
