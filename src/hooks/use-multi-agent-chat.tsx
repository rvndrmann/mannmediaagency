
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
  sceneId?: string; // Add sceneId
}

export function useMultiAgentChat(options: UseMultiAgentChatOptions = {}) {
  const { sessions, updateChatSession } = useChatSession(); // Get sessions from context
  const projectContext = useProjectContext();

  // Initialize messages state: Prioritize session, then localStorage, then initial props
  const [messages, setMessages] = useState<Message[]>(() => {
    console.log(`[Chat Init] Initializing for projectId: ${options.projectId}, sessionId: ${options.sessionId}`);

    // 1. Try loading from session context if sessionId is provided
    if (options.sessionId && sessions[options.sessionId]) {
      console.log(`[Chat Init] Found session ${options.sessionId}, loading ${sessions[options.sessionId].messages.length} messages from context.`);
      return sessions[options.sessionId].messages;
    } else if (options.sessionId) {
       console.log(`[Chat Init] SessionId ${options.sessionId} provided but not found in context.`);
    }

    // 2. Try loading from localStorage if projectId is provided
    if (options.projectId) {
      const storageKey = `multiAgentChatHistory_${options.projectId}`;
      try {
        const storedMessages = localStorage.getItem(storageKey);
        if (storedMessages) {
          console.log(`[Chat Init] Found ${JSON.parse(storedMessages).length} messages in localStorage for ${options.projectId}.`);
          return JSON.parse(storedMessages);
        } else {
          console.log(`[Chat Init] No messages found in localStorage for ${options.projectId}.`);
        }
      } catch (error) {
        console.error("Error reading initial messages from localStorage:", error);
      }
    } else {
      console.log("[Chat Init] No projectId provided for localStorage lookup.");
    }

    // 3. Fallback to initialMessages prop or empty array
    console.log("[Chat Init] Falling back to initialMessages prop or empty array.");
    return options.initialMessages || [];
  });
  
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
  const previousProjectIdRef = useRef<string | undefined>(options.projectId); // Initialize ref here

  // Effect to handle PROJECT ID CHANGES after initial load
  // Effect to handle PROJECT ID CHANGES after initial load (Removed duplicate comment)
  useEffect(() => {
    // This effect now only handles updating context or resetting state when projectId changes.
    // Initial loading is done in useState.
    console.log(`[Project Change Effect] Running for projectId: ${options.projectId}`);
    
    // Use the ref declared outside the effect
    
    if (options.projectId && options.projectId !== previousProjectIdRef.current) {
      console.log(`[Project Change Effect] Project ID changed from ${previousProjectIdRef.current} to ${options.projectId}. Reloading state.`);
      // Project ID has actually changed, load state for the new project
      const storageKey = `multiAgentChatHistory_${options.projectId}`;
      let loadedMessages: Message[] | null = null;
      try {
        const storedMessages = localStorage.getItem(storageKey);
        if (storedMessages) {
          loadedMessages = JSON.parse(storedMessages);
          console.log(`[Project Change Effect] Loaded ${loadedMessages?.length} messages for new project ${options.projectId}`);
        } else {
           console.log(`[Project Change Effect] No stored messages for new project ${options.projectId}`);
        }
      } catch (error) {
        console.error("Error reading messages from localStorage on project change:", error);
      }
      // Set messages for the new project, falling back to initial/empty
      setMessages(loadedMessages || options.initialMessages || []);
      setCurrentThreadId(null); // Reset thread ID when project changes

      // Update project context
      projectContext.setActiveProject(options.projectId);
      const fetchProject = async () => {
        await projectContext.fetchProjectDetails(options.projectId || '');
      };
      fetchProject();

    } else if (!options.projectId && previousProjectIdRef.current) {
       console.log(`[Project Change Effect] Project ID removed (was ${previousProjectIdRef.current}). Clearing state.`);
       // Project ID was removed, clear messages
       setMessages(options.initialMessages || []);
       setCurrentThreadId(null);
    } else {
       // Project ID is the same or still undefined, do nothing related to message state loading here.
       // We still might need to update the project context if other details changed,
       // but let's keep it simple for now unless needed.
       // projectContext.setActiveProject(options.projectId); // Potentially redundant if ID hasn't changed
    }

    // Update the ref *after* the comparison
    previousProjectIdRef.current = options.projectId;

    // Dependencies: Only run when projectId actually changes.
    // Assuming initialMessages and projectContext are stable or memoized upstream.
  }, [options.projectId, options.initialMessages, projectContext]);

  // Effect to save messages to localStorage whenever they change
  useEffect(() => {
    // Guard against saving/removing if projectId is not set
    if (!options.projectId) {
      console.log("[Chat Save Effect] No projectId, skipping localStorage update.");
      return;
    }

    const storageKey = `multiAgentChatHistory_${options.projectId}`;
    
    if (messages.length > 0) { // Save if messages exist
      console.log(`[Chat Save Effect] Saving ${messages.length} messages for projectId: ${options.projectId}`);
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (error) {
        console.error("Error saving messages to localStorage:", error);
        toast.error("Could not save chat history.");
      }
    } else { // Remove if messages array is empty
      console.log(`[Chat Save Effect] Removing messages from localStorage for projectId: ${options.projectId}`);
      try {
        // Check if item exists before removing to avoid unnecessary operations
        if (localStorage.getItem(storageKey)) {
          localStorage.removeItem(storageKey);
          console.log(`[Chat Save Effect] Successfully removed item for ${options.projectId}`);
        } else {
           console.log(`[Chat Save Effect] No item found to remove for ${options.projectId}`);
        }
      } catch (error) {
        console.error("Error removing messages from localStorage:", error);
      }
    }
  }, [messages, options.projectId]); // Dependencies remain the same

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
    setMessages([]); // Clear state messages - this triggers the save effect which removes from localStorage
    setCurrentThreadId(null); // Reset thread ID on clear
    
    // Explicitly clear localStorage as well (belt-and-suspenders)
    if (options.projectId) {
      const storageKey = `multiAgentChatHistory_${options.projectId}`;
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error("Error clearing messages from localStorage:", error);
      }
    }
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
          sceneId: options.sceneId, // <-- Include sceneId
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
      options.sceneId, // <-- Add sceneId dependency
      options.sessionId,
      updateChatSession,
      currentThreadId
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
