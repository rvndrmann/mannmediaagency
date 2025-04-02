
// --- Imports ---
import { useState, useCallback, useEffect, useRef } from "react";
import { Message, MessageType } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
// Remove AgentType import if no longer needed elsewhere
// import { AgentType } from "@/hooks/multi-agent/runner/types";
import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage } from "@/hooks/multi-agent/api-client"; // Already updated
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useProjectContext } from "@/hooks/multi-agent/project-context";

// Remove AgentType export if no longer needed
// export type { AgentType } from "@/hooks/multi-agent/runner/types";

interface UseMultiAgentChatOptions {
  initialMessages?: Message[];
  // onAgentSwitch?: (from: string, to: string) => void; // Remove agent switch callback
  projectId?: string;
  sessionId?: string; // Keep sessionId if used for other state management
}

export function useMultiAgentChat(options: UseMultiAgentChatOptions = {}) {
  const { updateChatSession } = useChatSession();
  const projectContext = useProjectContext();
  
  const [messages, setMessages] = useState<Message[]>(
    options.initialMessages || []
  );
  
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Remove activeAgent state
  // const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null); // <-- Add state for thread_id
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null);
  // Remove performance/tool execution toggles if not used by new backend
  // const [usePerformanceModel, setUsePerformanceModel] = useState<boolean>(false);
  // const [enableDirectToolExecution, setEnableDirectToolExecution] = useState<boolean>(false);
  const [tracingEnabled, setTracingEnabled] = useState<boolean>(true); // Keep if tracing is still relevant
  // Remove handoff state
  // const [handoffInProgress, setHandoffInProgress] = useState<boolean>(false);
  // Remove activeProjectContext state if projectId from options is sufficient
  // const [activeProjectContext, setActiveProjectContext] = useState<string | null>(null);
  // Keep instructions if needed for display, but they aren't used for API calls now
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({
     main: "You are a helpful AI assistant focused on video project tasks.", // Update default description
     // Remove other agent types
  });

  // Enhanced refs for handling debouncing and preventing duplicate submissions
  const lastSubmissionTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const processingTimeoutRef = useRef<number | null>(null);
  const submissionIdRef = useRef<string | null>(null);

  // Simplify project context handling - backend uses projectId now
  useEffect(() => {
    if (options.projectId) {
      projectContext.setActiveProject(options.projectId);
      // Fetch details if needed for UI, but don't add system message here
      const fetchProject = async () => {
        await projectContext.fetchProjectDetails(options.projectId || '');
      };
      fetchProject();
      // Reset thread if project changes? Or handle in backend? For now, just set active project.
      // Consider resetting thread ID if project changes significantly mid-conversation
      // setCurrentThreadId(null); // Example: Reset thread on project change
    }
  }, [options.projectId, projectContext]);

  // Keep user credits fetch logic
  useEffect(() => {
    const fetchCredits = async () => {
      // ... (keep existing logic)
    };
    fetchCredits();
  }, []);

  // Keep tracing logic if needed
  useEffect(() => {
    // ... (keep existing logic)
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
  
  // Remove agent switching logic
  // const switchAgent = (agentId: AgentType) => { ... };
  // const getAgentName = (agentType: AgentType): string => { ... };
  
  const clearChat = () => {
    // Preserve any system context messages if needed, otherwise clear all
    // const systemMessages = messages.filter(msg => msg.role === 'system' && msg.type === 'context');
    setMessages([]); // Clear all messages
    setCurrentThreadId(null); // Reset thread ID on clear
  };
  
  const addAttachments = (newAttachments: any[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  };
  
  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };
  
  // Keep instruction update logic if UI allows editing (though it won't affect backend directly now)
  const updateAgentInstructions = (agentType: string, instructions: string) => { // Use string for agentType key
    setAgentInstructions(prev => ({
      ...prev,
      [agentType]: instructions
    }));
    toast.success(`Updated ${agentType} instructions display`); // Adjust message
  };
  const getAgentInstructions = (agentType: string): string => { // Use string
    return agentInstructions[agentType] || "";
  };
  
  // Remove performance/tool toggles if not used
  // const togglePerformanceMode = () => { ... };
  // const toggleDirectToolExecution = () => { ... };
  
  // Keep tracing toggle if used
  const toggleTracing = () => {
    // ... (keep existing logic)
  };
  
  // Remove setProjectContext if options.projectId is sufficient
  // const setProjectContext = (projectId: string, context?: any) => { ... };
  
  // Remove old handoff function
  // const processHandoff = async (...) => { ... };
  
  // --- Update handleSendMessage ---
  const handleSendMessage = useCallback(async (messageText: string, attachments: any[] = []) => {
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
            type: 'error',
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
        // Prepare context data if needed (though backend primarily uses projectId now)
        const contextData: Record<string, any> = {
          // Add any extra frontend context if necessary
        };

        // Call the updated edge function client
        const response = await sendChatMessage({
          input: messageText,
          // Pass currentThreadId, projectId, attachments etc.
          thread_id: currentThreadId, // <-- Pass current thread ID
          projectId: options.projectId,
          attachments,
          runId, // Keep for tracing
          groupId, // Keep for tracing
          contextData,
          // Remove fields no longer needed by backend/client
          conversationHistory: [], // History managed by thread
          usePerformanceModel: false, // Model managed by Assistant
        });
        
        // --- Process Response ---
        // Store the thread_id returned by the backend
        if (response.thread_id && response.thread_id !== currentThreadId) {
            console.log("Received new/updated thread_id:", response.thread_id);
            setCurrentThreadId(response.thread_id); // <-- Store thread ID
        }

        // Create assistant message
        const assistantMessage: Message = {
          id: uuidv4(), // Or use an ID from response if available
          role: "assistant",
          content: response.content, // Use content directly
          createdAt: new Date().toISOString(),
          // Remove agentType
          // agentType: response.agentType
          runId: response.run_id // Store run_id if useful for UI/debugging
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update chat session if we have one
        if (options.sessionId) {
          updateChatSession(options.sessionId, [...messages, userMessage, assistantMessage]);
        }
        
        // Remove old handoff check
        // if (response.handoffRequest) { ... }
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
          type: "error",
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
  }, [
      isLoading,
      messages,
      options.projectId,
      options.sessionId,
      updateChatSession,
      currentThreadId // <-- Add dependency
      // Remove dependencies no longer used: activeAgent, usePerformanceModel, processHandoff
  ]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    // Remove activeAgent, handoffInProgress
    // activeAgent,
    // handoffInProgress,
    agentInstructions, // Keep if UI uses it
    userCredits,
    pendingAttachments,
    setPendingAttachments,
    // Remove usePerformanceModel, enableDirectToolExecution if not used
    // usePerformanceModel,
    // enableDirectToolExecution,
    tracingEnabled, // Keep if UI uses it
    handleSubmit,
    // Remove switchAgent
    // switchAgent,
    clearChat,
    // Remove togglePerformanceMode, toggleDirectToolExecution if not used
    // togglePerformanceMode,
    // toggleDirectToolExecution,
    toggleTracing, // Keep if UI uses it
    addAttachments,
    removeAttachment,
    updateAgentInstructions, // Keep if UI uses it
    getAgentInstructions, // Keep if UI uses it
    // Remove setProjectContext if options.projectId is sufficient
    // setProjectContext,
    // Remove processHandoff
    // processHandoff
    currentThreadId // Expose thread ID if needed externally
  };
}
