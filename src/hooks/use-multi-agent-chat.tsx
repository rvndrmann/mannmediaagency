
import { useState, useCallback, useEffect, useRef } from "react";
import { Message, Attachment, MessageType } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage } from "@/hooks/multi-agent/api-client";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useProjectContext } from "@/hooks/multi-agent/project-context";

export type { AgentType } from "@/hooks/multi-agent/runner/types";

interface UseMultiAgentChatOptions {
  initialMessages?: Message[];
  onAgentSwitch?: (from: string, to: string) => void;
  projectId?: string;
  sessionId?: string;
}

export function useMultiAgentChat(options: UseMultiAgentChatOptions = {}) {
  const { updateChatSession } = useChatSession();
  const { projectDetails, projectContent } = useProjectContext({ initialProjectId: options.projectId });
  
  const [messages, setMessages] = useState<Message[]>(
    options.initialMessages || []
  );
  
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null);
  const [usePerformanceModel, setUsePerformanceModel] = useState<boolean>(false);
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState<boolean>(false);
  const [tracingEnabled, setTracingEnabled] = useState<boolean>(true);
  const [handoffInProgress, setHandoffInProgress] = useState<boolean>(false);
  const [activeProjectContext, setActiveProjectContext] = useState<string | null>(null);
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({
    main: "You are a helpful AI assistant focused on general tasks.",
    script: "You specialize in writing scripts and creative content.",
    image: "You specialize in creating detailed image prompts.",
    tool: "You specialize in executing tools and technical tasks.",
    scene: "You specialize in creating detailed visual scene descriptions.",
    data: "You specialize in data analysis and processing."
  });

  // Enhanced refs for handling debouncing and preventing duplicate submissions
  const lastSubmissionTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const processingTimeoutRef = useRef<number | null>(null);
  const submissionIdRef = useRef<string | null>(null);

  // Initialize with project context if available
  useEffect(() => {
    if (projectDetails && projectContent && options.projectId) {
      // Add a system message about the project if it doesn't exist
      const hasProjectContextMessage = messages.some(msg => 
        msg.role === 'system' && 
        msg.content.includes(`Project context: ${projectDetails.title || options.projectId}`)
      );
      
      if (!hasProjectContextMessage) {
        // Create a properly typed message with "context" as MessageType
        const contextMessage: Message = {
          id: uuidv4(),
          role: "system",
          content: `Project context: ${projectDetails.title || options.projectId}\n\n${projectContent}`,
          createdAt: new Date().toISOString(),
          type: "context" as MessageType
        };
        
        setMessages(prev => [...prev, contextMessage]);
      }
      
      setActiveProjectContext(options.projectId);
    }
  }, [projectDetails, projectContent, options.projectId, messages]);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('user_credits')
          .select('credits_remaining')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        setUserCredits(data);
      } catch (error) {
        console.error("Error fetching user credits:", error);
      }
    };
    
    fetchCredits();
  }, []);

  useEffect(() => {
    try {
      const savedTracingEnabled = localStorage.getItem('multiagent_tracing_enabled');
      if (savedTracingEnabled !== null) {
        setTracingEnabled(JSON.parse(savedTracingEnabled));
      }
    } catch (e) {
      console.error('Error loading tracing preference from localStorage', e);
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isLoading) {
      console.log("Already loading, ignoring submit");
      return;
    }
    
    if (!input.trim() && pendingAttachments.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }
    
    await handleSendMessage(input, pendingAttachments);
    setInput("");
    setPendingAttachments([]);
  };
  
  const switchAgent = (agentId: AgentType) => {
    if (options.onAgentSwitch) {
      options.onAgentSwitch(activeAgent, agentId);
    }
    setActiveAgent(agentId);
    toast.success(`Switched to ${getAgentName(agentId)}`);
  };
  
  const getAgentName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      case "data": return "Data Agent";
      default: return "Assistant";
    }
  };
  
  const clearChat = () => {
    // Preserve any system context messages about the project
    const systemMessages = messages.filter(msg => 
      msg.role === 'system' && (msg.type === 'context' || msg.content.includes('Project context'))
    );
    
    setMessages(systemMessages);
  };
  
  const addAttachments = (newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  };
  
  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };
  
  const updateAgentInstructions = (agentType: AgentType, instructions: string) => {
    setAgentInstructions(prev => ({
      ...prev,
      [agentType]: instructions
    }));
    toast.success(`Updated ${getAgentName(agentType)} instructions`);
  };
  
  const getAgentInstructions = (agentType: AgentType): string => {
    return agentInstructions[agentType] || "";
  };
  
  const togglePerformanceMode = () => {
    setUsePerformanceModel(!usePerformanceModel);
    toast.success(`Switched to ${!usePerformanceModel ? "Performance" : "High Quality"} mode`);
  };
  
  const toggleDirectToolExecution = () => {
    setEnableDirectToolExecution(!enableDirectToolExecution);
    toast.success(`${!enableDirectToolExecution ? "Enabled" : "Disabled"} direct tool execution`);
  };
  
  const toggleTracing = () => {
    const newTracingEnabled = !tracingEnabled;
    setTracingEnabled(newTracingEnabled);
    
    try {
      localStorage.setItem('multiagent_tracing_enabled', JSON.stringify(newTracingEnabled));
    } catch (e) {
      console.error('Error saving tracing preference to localStorage', e);
    }
    
    toast.success(`${!tracingEnabled ? "Enabled" : "Disabled"} interaction tracing`);
  };
  
  const setProjectContext = (projectId: string, context?: any) => {
    setActiveProjectContext(projectId);
    
    if (projectDetails && projectContent) {
      // Add a system message with project context if it doesn't exist
      const hasProjectContextMessage = messages.some(msg => 
        msg.role === 'system' && 
        msg.content.includes(`Project context: ${projectDetails.title || projectId}`)
      );
      
      if (!hasProjectContextMessage) {
        const contextMessage: Message = {
          id: uuidv4(),
          role: "system",
          content: `Project context: ${projectDetails.title || projectId}\n\n${projectContent}`,
          createdAt: new Date().toISOString(),
          type: "context" as MessageType
        };
        
        setMessages(prev => [...prev, contextMessage]);
      }
    }
  };
  
  // Handle a handoff between agents
  const processHandoff = async (
    fromAgent: AgentType, 
    toAgent: AgentType, 
    reason: string, 
    preserveFullHistory: boolean = true,
    additionalContext: Record<string, any> = {}
  ) => {
    setHandoffInProgress(true);
    
    try {
      const continuityData = {
        fromAgent,
        toAgent,
        reason,
        timestamp: new Date().toISOString(),
        preserveHistory: preserveFullHistory,
        additionalContext
      };
      
      const handoffMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Conversation transferred from ${getAgentName(fromAgent)} to ${getAgentName(toAgent)}. Reason: ${reason}`,
        createdAt: new Date().toISOString(),
        type: "handoff" as MessageType,
        continuityData
      };
      
      setMessages(prev => [...prev, handoffMessage]);
      
      switchAgent(toAgent);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHandoffInProgress(false);
      
      return true;
    } catch (error) {
      console.error("Error processing handoff:", error);
      setHandoffInProgress(false);
      return false;
    }
  };
  
  // Completely redesigned message handling to prevent duplicates and race conditions
  const handleSendMessage = useCallback(async (messageText: string, attachments: Attachment[] = []) => {
    if (!messageText.trim() && attachments.length === 0) return;
    
    if (isLoading || processingRef.current) {
      console.log("Already processing a request - preventing duplicate send");
      return;
    }
    
    // Generate a unique message ID and submission ID
    const messageId = uuidv4();
    const submissionId = uuidv4();
    
    // Check for very recent submissions to prevent double-clicks
    const now = Date.now();
    if (now - lastSubmissionTimeRef.current < 1000) {
      console.log("Preventing duplicate submission - too soon after last submission");
      return;
    }
    
    // Clear any pending timeout
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    
    // Set a timeout to reset processing state if something goes wrong
    processingTimeoutRef.current = window.setTimeout(() => {
      if (processingRef.current && submissionIdRef.current === submissionId) {
        console.log("Processing timeout reached, resetting state");
        processingRef.current = false;
        setIsLoading(false);
        submissionIdRef.current = null;
        
        // Add error message
        const timeoutErrorId = uuidv4();
        
        setMessages(prev => [
          ...prev,
          {
            id: timeoutErrorId,
            role: 'system',
            content: 'The request timed out. Please try again.',
            createdAt: new Date().toISOString(),
            type: 'error' as MessageType,
            status: 'error'
          }
        ]);
        
        toast.error("Request timed out. Please try again.");
      }
    }, 30000) as unknown as number; // 30 second safety timeout
    
    // Update tracking refs
    lastSubmissionTimeRef.current = now;
    processingRef.current = true;
    submissionIdRef.current = submissionId;
    
    try {
      setIsLoading(true);
      
      // Create user message
      const userMessage: Message = {
        id: messageId,
        role: "user",
        content: messageText,
        createdAt: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      // Add user message to chat history
      setMessages(prev => [...prev, userMessage]);
      
      // Update chat session if we have one
      if (options.sessionId) {
        updateChatSession(options.sessionId, [...messages, userMessage]);
      }
      
      // Generate unique IDs for this conversation
      const runId = uuidv4();
      const groupId = options.sessionId || uuidv4();
      
      try {
        // Add project context to the request if available
        const contextData: Record<string, any> = {
          projectId: options.projectId
        };
        
        if (projectDetails) {
          contextData.projectTitle = projectDetails.title;
          contextData.projectDescription = projectDetails.description;
          contextData.projectContent = projectContent;
          contextData.hasFullScript = !!projectDetails.fullScript;
          contextData.scenesCount = projectDetails.scenes ? projectDetails.scenes.length : 0;
        }
        
        // Call the edge function using the api-client
        const response = await sendChatMessage({
          input: messageText,
          agentType: activeAgent,
          conversationHistory: [...messages, userMessage],
          usePerformanceModel,
          attachments,
          runId,
          groupId,
          projectId: options.projectId,
          contextData
        });
        
        // Handle the response
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: response.content,
          createdAt: new Date().toISOString(),
          agentType: response.agentType
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update chat session if we have one
        if (options.sessionId) {
          updateChatSession(options.sessionId, [...messages, userMessage, assistantMessage]);
        }
        
        // Check if there's a handoff request
        if (response.handoffRequest) {
          const targetAgent = response.handoffRequest.targetAgent;
          await processHandoff(
            activeAgent,
            targetAgent as AgentType,
            response.handoffRequest.reason,
            true,
            response.handoffRequest.additionalContext
          );
        }
      } catch (error) {
        console.error("Error in chat processing:", error);
        
        // Add error message to chat
        const errorMessage: Message = {
          id: uuidv4(),
          role: "system",
          content: error instanceof Error 
            ? `Error: ${error.message}` 
            : "An unknown error occurred while processing your request.",
          createdAt: new Date().toISOString(),
          type: "error" as MessageType,
          status: "error"
        };
        
        setMessages(prev => [...prev, errorMessage]);
        toast.error("Failed to process message");
      }
    } catch (error) {
      console.error("Error in chat processing:", error);
      toast.error("Failed to process message");
    } finally {
      // Reset state after processing
      processingRef.current = false;
      submissionIdRef.current = null;
      setIsLoading(false);
      
      // Clear the safety timeout
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [activeAgent, isLoading, messages, options.projectId, options.sessionId, projectContent, projectDetails, updateChatSession, usePerformanceModel]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    activeAgent,
    userCredits,
    pendingAttachments,
    setPendingAttachments,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    handoffInProgress,
    agentInstructions,
    setProjectContext,
    handleSubmit,
    switchAgent,
    clearChat,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    addAttachments,
    removeAttachment,
    updateAgentInstructions,
    getAgentInstructions,
    processHandoff
  };
}
