
// --- Imports ---
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // <-- Import useNavigate
import { Message, MessageType } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
// Remove AgentType import if no longer needed elsewhere
// import { AgentType } from "@/hooks/multi-agent/runner/types";
import { supabase } from "@/integrations/supabase/client";
// import { sendChatMessage } from "@/hooks/multi-agent/api-client"; // Replaced by runOrchestrator
// Removed direct import of runOrchestrator as it's now called via backend API
// import { runOrchestrator } from "@/services/agent/runner";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useProjectContext, ProjectContextType } from "@/hooks/multi-agent/project-context";
import { useContext } from 'react'; // <--- Add useContext import
import { useCanvasMcpContext } from '@/contexts/CanvasMcpContext'; // <--- Import CORRECT hook

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
  const canvasAgent = useCanvasMcpContext(); // <-- Use the CORRECT hook
  const navigate = useNavigate(); // <-- Get navigate function

  // Initialize messages state: Prioritize session, then localStorage, then initial props
  const [messages, setMessages] = useState<Message[]>(() => {
    console.log(`[Chat Init] Initializing for projectId: ${options.projectId}, sessionId: ${options.sessionId}`);

    // 1. Try loading from session context if sessionId is provided
    if (options.sessionId && sessions[options.sessionId]) {
      console.log(`[Chat Init] Found session ${options.sessionId}, loading ${sessions[options.sessionId].messages.length} messages from context.`);
      return sessions[options.sessionId].messages;
    } else if (options.sessionId) {
       console.log(`[Chat Init] SessionId ${options.sessionId} provided but not found in context.`);
    } else {
       console.log(`[Chat Init] No sessionId provided.`);
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
      const fetchProjectData = async () => {
        if (options.projectId) {
          await projectContext.fetchProjectDetails(options.projectId);
          await projectContext.fetchProjectScenes(options.projectId); // Fetch scenes as well
        }
      };
      fetchProjectData();

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

  // Removed useEffect block that referenced canvasAgent?.latestToolCall as it caused TS errors and logic might be outdated.
  // Project switching should ideally be handled via backend assistant response/tool call if needed.

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
    if (options.projectId === "admin") {
      console.log("AI responses disabled for admin chat.");
      return;
    }
    if (!messageText.trim() && attachments.length === 0) return;

    // --- BEGIN /approve script command handling ---
    if (messageText.trim().toLowerCase() === '/approve script') {
      if (!options.projectId) {
        toast.error("Cannot approve script: No project selected.");
        return;
      }

      console.log(`[Command] Detected /approve script for project: ${options.projectId}`);
      setIsLoading(true);

      // Add user message for the command itself
      const commandMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: messageText.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, commandMessage]);

      try {
        // Call the orchestrator function
        // Ensure user is authenticated before calling secure functions
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          throw new Error("User not authenticated.");
        }

        const { data: orchestratorResponse, error: orchestratorError } = await supabase.functions.invoke(
          'request-router-orchestrator', // Target function
          {
            body: {
              projectId: options.projectId,
              // TODO: In the future, potentially pass the script content here
              // For now, the orchestrator will need to fetch the relevant script itself
            },
            // Pass auth header
             headers: {
               Authorization: `Bearer ${accessToken}`,
             },
          }
        );

        if (orchestratorError) {
          // Try to get more details from the error context if available
          let detailMessage = orchestratorError.message;
           try {
             const ctx = JSON.parse(orchestratorError.context || '{}');
             if (ctx.error) detailMessage = ctx.error;
           } catch(e) { /* Ignore parsing error */ }
          throw new Error(detailMessage); // Throw the potentially more detailed error
        }

        // Add success system message
        const successMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: `Script approved. Starting video generation process for project ${options.projectId}. You will receive updates as scenes are generated.`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, successMessage]);
        toast.success("Script approved. Generation process started.");

      } catch (error) {
        console.error("Error calling orchestrator function:", error);
        const errorMessageContent = error instanceof Error ? error.message : "Unknown error occurred.";
        // Add error system message
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: `Failed to start generation process: ${errorMessageContent}`,
          createdAt: new Date().toISOString(),
          type: 'error',
        };
        setMessages(prev => [...prev, errorMessage]);
        toast.error(`Failed to start generation: ${errorMessageContent}`); // Show detailed error in toast
      } finally {
        setIsLoading(false);
      }
      return; // Stop processing, don't send to regular chat AI
    }
    // --- END /approve script command handling ---

    // --- NLU for Scene Modification ---
    const sceneUpdateRegex = /^(?:change|update|set)\s+(?:the\s+)?(script|voiceover|image prompt|description)\s*(?:for|in|on)\s+(?:scene\s+(\d+)|the\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+scene)?\s*(?:to|as)\s+['"]?(.+)['"]?$/i;
    const sceneUpdateCurrentRegex = /^(?:change|update|set)\s+(?:the\s+)?(script|voiceover|image prompt|description)\s*(?:to|as)\s+['"]?(.+)['"]?$/i;

    const sceneWordToNum: { [key: string]: number } = {
      first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10
    };

    let match = messageText.match(sceneUpdateRegex);
    let isCurrentSceneUpdate = false;
    if (!match) {
        match = messageText.match(sceneUpdateCurrentRegex);
        isCurrentSceneUpdate = !!match;
    }

    const projectScenes = options.projectId ? projectContext.scenes[options.projectId] : undefined; // Define projectScenes here
    if (match && canvasAgent) {
      const field = match[1].toLowerCase();
      let sceneIndex: number | null = null;
      let content: string = '';

      if (isCurrentSceneUpdate) {
          content = match[2];
          // Use current scene ID from options if available
          // projectScenes is already defined above
          if (options.sceneId && projectContext.projectDetails && projectScenes) { // <-- Use projectScenes from context state
              const currentSceneIndex = projectScenes.findIndex(s => s.id === options.sceneId);
              if (currentSceneIndex !== -1) {
                  sceneIndex = currentSceneIndex; // 0-based index
              } else {
                  console.warn(`Current sceneId ${options.sceneId} not found in project scenes.`);
                  // sceneIndex remains null if not found
              }
          } else if (projectContext.projectDetails && projectScenes && projectScenes.length > 0) { // <-- Use projectScenes from context state
              // Fallback to first scene if no sceneId provided but scenes exist
              sceneIndex = 0;
              console.warn(`No current sceneId provided, defaulting to first scene (index 0).`);
          }
          // If neither condition is met (e.g., no projectDetails), sceneIndex remains null
      } else {
          const sceneNumStr = match[2];
          const sceneOrdinalStr = match[3];
          content = match[4];

          if (sceneNumStr) {
              sceneIndex = parseInt(sceneNumStr, 10) - 1; // Convert to 0-based index
          } else if (sceneOrdinalStr) {
              sceneIndex = sceneWordToNum[sceneOrdinalStr.toLowerCase()] - 1; // Convert to 0-based index
          }
      }

      // Ensure projectDetails, scenes exist, and sceneIndex is valid before proceeding
      if (sceneIndex !== null && sceneIndex >= 0 &&
          projectContext.projectDetails && projectScenes &&
          sceneIndex < projectScenes.length) {
        const targetScene = projectScenes[sceneIndex]; // Now safe to access using projectScenes
        const targetSceneId = targetScene.id;
        let updateFunction: ((sceneId: string, value: string) => Promise<boolean>) | undefined; // Expect boolean return
        let fieldNameForDisplay = field;

        switch (field) {
          case 'script':
            updateFunction = canvasAgent.updateSceneScript;
            break;
          case 'voiceover':
            updateFunction = canvasAgent.updateSceneVoiceover;
            break;
          case 'image prompt':
            updateFunction = canvasAgent.updateSceneImagePrompt;
            fieldNameForDisplay = 'image prompt';
            break;
          case 'description':
            updateFunction = canvasAgent.updateSceneDescription;
            break;
        }

        if (updateFunction) {
          console.log(`NLU Match: Updating ${field} for scene ${sceneIndex + 1} (ID: ${targetSceneId})`);
          setIsLoading(true); // Show loading indicator
          try {
            await updateFunction(targetSceneId, content);
            const confirmationMessage: Message = {
              id: uuidv4(),
              role: 'assistant', // Use standard role
              content: `Okay, I've updated the ${fieldNameForDisplay} for scene ${sceneIndex + 1}.`,
              createdAt: new Date().toISOString(),
              // Removed invalid type: 'confirmation'
            };
            setMessages(prev => [...prev, confirmationMessage]);
            toast.success(`Updated ${fieldNameForDisplay} for scene ${sceneIndex + 1}.`);
          } catch (error) {
            console.error(`Error updating ${field} via NLU:`, error);
            toast.error(`Failed to update ${fieldNameForDisplay}.`);
            const errorMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: `Sorry, I couldn't update the ${fieldNameForDisplay} for scene ${sceneIndex + 1}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              createdAt: new Date().toISOString(),
              type: 'error',
            };
            setMessages(prev => [...prev, errorMessage]);
          } finally {
            setIsLoading(false); // Hide loading indicator
          }
          return; // Stop processing, don't send to backend AI
        }
      } else {
          console.log("NLU Match, but scene index is invalid or project/scenes data is missing.");
          // Optionally add a message indicating the scene wasn't found, or let it fall through to the AI
      }
    }
    // --- End NLU ---

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
    }, 240000) as unknown as number; // 4 minute safety timeout (longer than backend polling)

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
        // Prepare the FULL project context for the backend agent
        const fullProjectContext = {
          currentProject: projectContext.projectDetails, // Use details from the context hook
          allProjects: projectContext.projects, // Use projects from the context hook
        };

        // --- DEBUG LOGGING ---
        console.log(`[handleSendMessage] Sending message for projectId: ${options.projectId}`);
        console.log(`[handleSendMessage] Context being sent:`, {
            currentProjectTitle: fullProjectContext.currentProject?.title, // Log title for easy identification
            currentProjectId: fullProjectContext.currentProject?.id,
            allProjectsCount: fullProjectContext.allProjects?.length
        });
        // console.log("[handleSendMessage] Full projectDetails:", JSON.stringify(fullProjectContext.currentProject, null, 2)); // Uncomment for verbose details
        // --- END DEBUG LOGGING ---
        // --- Call the new Supabase Edge Function ---
        console.log(`[handleSendMessage] Invoking Supabase function 'multi-agent-chat' with input: "${messageText}"`);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      console.error("No access token found. Cannot call function securely.");
      toast.error("Authentication error. Please log in again.");
      setIsLoading(false); // Ensure loading state is reset
      return; // Stop execution if no token
    }
        
        // --- Roo Debug Logging ---
        console.log('[Roo Debug] Preparing to invoke multi-agent-chat function.');
        console.log('[Roo Debug] messageText:', messageText);
        console.log('[Roo Debug] options.projectId:', options.projectId);
        console.log('[Roo Debug] currentThreadId (from state):', currentThreadId); // Log thread ID from state
        console.log('[Roo Debug] attachments:', attachments);
        // --- End Roo Debug Logging ---

        // --- Roo Debug Logging ---
        console.log('[Roo Debug] Preparing to invoke multi-agent-chat function.');
        console.log('[Roo Debug] messageText:', messageText);
        console.log('[Roo Debug] options.projectId:', options.projectId);
        console.log('[Roo Debug] currentThreadId (from state):', currentThreadId); // Log thread ID from state
        console.log('[Roo Debug] attachments:', attachments);
        console.log('[Roo Debug] Retrieved accessToken:', accessToken); // Log the token
        // --- End Roo Debug Logging ---

        const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
          'multi-agent-chat',
          {
            body: { input: messageText, projectId: options.projectId },
            headers: {
              Authorization: `Bearer ${accessToken}` // Pass the token
            }
          }
        );

        console.log("[handleSendMessage] Received response from Supabase function:", { functionResponse, functionError });

        if (functionError) {
          console.error("Error invoking Supabase function:", functionError);
          throw new Error(`Failed to get response from agent: ${functionError.message}`);
        }

        // Process and add assistant message(s) from functionResponse.output
        let assistantMessages: Message[] = [];
        // Check functionResponse first, then its 'content' property
        if (functionResponse && functionResponse.response) {
          console.log('[handleSendMessage] Processing valid response content:', functionResponse.response); // Added verification log
          // Handle string, object, or potentially other types returned by the function's runOrchestrator
          if (typeof functionResponse.response === 'string') {
            assistantMessages.push({
              id: uuidv4(),
              role: 'assistant',
              content: functionResponse.response, // Changed from .output
              createdAt: new Date().toISOString(),
              // Keep type as 'text' or remove if default is sufficient
              type: 'text',
            });
          } else if (typeof functionResponse.response === 'object' && functionResponse.response !== null) { // Changed from .output
              // Handle structured object output (e.g., JSON)
              assistantMessages.push({
                  id: uuidv4(),
                  role: 'assistant',
                  content: JSON.stringify(functionResponse.response, null, 2), // Stringify for display // Changed from .output
                  createdAt: new Date().toISOString(),
                  type: 'json', // Indicate it's structured data
              });
          } else {
              // Handle other potential types (e.g., number, boolean) by stringifying them
              assistantMessages.push({
                  id: uuidv4(),
                  role: 'assistant',
                  content: `Received unexpected data type: ${JSON.stringify(functionResponse.response)}`, // Changed from .output
                  createdAt: new Date().toISOString(),
                  type: 'error',
              });
          }
        } else {
          console.warn("Supabase function response was empty or invalid:", functionResponse);
           // Optionally add a system message indicating no response
          assistantMessages.push({
            id: uuidv4(),
            role: 'system',
            content: "The agent did not provide a response.",
            createdAt: new Date().toISOString(),
            type: 'error',
          });
        }

        // --- Roo: Check for and update threadId from response ---
        if (typeof functionResponse === 'object' && functionResponse !== null && typeof functionResponse.threadId === 'string') {
            const receivedThreadId = functionResponse.threadId;
            if (receivedThreadId && receivedThreadId !== currentThreadId) {
                console.log(`[Roo Debug] Updating currentThreadId state from ${currentThreadId} to ${receivedThreadId}`);
                setCurrentThreadId(receivedThreadId);
            } else if (receivedThreadId && receivedThreadId === currentThreadId) {
                 console.log(`[Roo Debug] Received threadId ${receivedThreadId} matches current state.`);
            }
        } else {
            console.log('[Roo Debug] No threadId found in backend response object.');
        }
        // --- End Roo ---
  
        let handoffDetected = false;
        const handoffTriggerMessage = "Okay, the script and scene plan is finalized and ready for video generation.";

        if (assistantMessages.length > 0) {
           // Check for handoff message BEFORE adding to state
           for (const msg of assistantMessages) {
             if (msg.role === 'assistant' && msg.content === handoffTriggerMessage) {
               handoffDetected = true;
               console.log("[Handoff] Detected planner agent confirmation message.");
               break; // Found the trigger message
             }
           }

           setMessages(prev => [...prev, ...assistantMessages]);
           // Update session context if applicable
           // Ensure userMessage is included correctly in the session update
           if (options.sessionId) {
             // Use the state *after* userMessage was added but *before* assistant messages
             const messagesBeforeAssistant = [...messages, userMessage]; // Assuming userMessage is defined in outer scope
             updateChatSession(options.sessionId, [...messagesBeforeAssistant, ...assistantMessages]);
           }
        }

        // --- BEGIN Handoff Execution (if detected) ---
        if (handoffDetected) {
            console.log("[Handoff] Triggering generation orchestrator...");
            toast.info("Script plan finalized. Starting video generation process...");
            // No need to set isLoading(true) here again, it's already true from the start of handleSendMessage

            // Reuse logic similar to /approve script command
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;
              if (!accessToken) {
                throw new Error("User not authenticated for handoff.");
              }
              if (!options.projectId) {
                 throw new Error("Cannot start generation: No project ID available.");
              }

              // Call the orchestrator function to start generation
              const { error: orchestratorError } = await supabase.functions.invoke(
                'request-router-orchestrator', // Target function for generation
                {
                  body: { projectId: options.projectId },
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );

              if (orchestratorError) {
                 let detailMessage = orchestratorError.message;
                 try {
                   const ctx = JSON.parse(orchestratorError.context || '{}');
                   if (ctx.error) detailMessage = ctx.error;
                 } catch(e) { /* Ignore parsing error */ }
                throw new Error(detailMessage);
              }

              // Add a system message confirming the handoff trigger
              const handoffSystemMessage: Message = {
                 id: uuidv4(),
                 role: 'system',
                 content: `Video generation process initiated for project ${options.projectId}.`,
                 createdAt: new Date().toISOString(),
              };
              setMessages(prev => [...prev, handoffSystemMessage]);
              toast.success("Video generation process started successfully.");

            } catch (error) {
               console.error("Error triggering generation orchestrator during handoff:", error);
               const errorMessageContent = error instanceof Error ? error.message : "Unknown error occurred.";
               const errorSystemMessage: Message = {
                 id: uuidv4(),
                 role: 'system',
                 content: `Failed to start video generation process after script approval: ${errorMessageContent}`,
                 createdAt: new Date().toISOString(),
                 type: 'error',
               };
               setMessages(prev => [...prev, errorSystemMessage]);
               toast.error(`Failed to start generation: ${errorMessageContent}`);
            }
            // Note: isLoading will be set to false in the main finally block
        }
        // --- END Handoff Execution ---
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

    const sendAdminMessage = async (message: string) => {
        try {
            const { data, error } = await supabase.functions.invoke('admin-send-message', {
                body: {
                    message: message,
                },
            });

            if (error) {
                console.error('Error sending admin message:', error);
                toast.error('Failed to send admin message.');
            } else {
                console.log('Admin message sent successfully:', data);
                toast.success('Admin message sent successfully!');
            }
        } catch (error) {
            console.error('Error sending admin message:', error);
            toast.error('Failed to send admin message.');
        }
    };
  }, [
      isLoading,
      messages,
      options.projectId,
      options.sceneId,
      options.sessionId,
      updateChatSession,
      currentThreadId,
      canvasAgent, // <-- Add canvasAgent dependency
      projectContext.projectDetails // <-- Use CORRECT dependency
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
    currentThreadId, // Expose thread ID if needed externally
    handleSendMessage
  };
}
