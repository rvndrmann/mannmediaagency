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
  // const [currentThreadId, setCurrentThreadId] = useState<string | null>(null); // <-- REMOVED: Thread ID is now managed by the backend orchestrator
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
      // setCurrentThreadId(null); // REMOVED: No longer managed here

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
       // setCurrentThreadId(null); // REMOVED: No longer managed here
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
    // setCurrentThreadId(null); // REMOVED: No longer managed here

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
    lastSubmissionTimeRef.current = now;
    processingRef.current = true;
    submissionIdRef.current = submissionId; // Store the current submission ID

    // Set a timeout to reset processing state in case of unexpected hangs
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = window.setTimeout(() => {
      if (processingRef.current && submissionIdRef.current === submissionId) {
        console.warn(`Processing timeout reached for submission ${submissionId}. Resetting state.`);
        setIsLoading(false);
        processingRef.current = false;
        submissionIdRef.current = null;
        toast.error("Request timed out. Please try again.");
      }
    }, 60000); // 60-second timeout

    setIsLoading(true);

    // Add user message immediately
    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: messageText.trim(),
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const messagesBeforeAssistant = [...messages, userMessage];
    setMessages(messagesBeforeAssistant);

    // Clear pending attachments after adding them to the message
    setPendingAttachments([]);

    // --- Call Backend Orchestrator ---
    try {
      // Ensure user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error("User not authenticated.");
      }

      // --- Prepare data for the backend ---
      // 1. Determine intent (simple example, replace with actual NLU/intent detection if needed)
      let intent = 'unknown';
      if (/script/i.test(messageText)) intent = 'generate_script'; // Basic keyword matching
      if (/refine|change|update/i.test(messageText) && /script/i.test(messageText)) intent = 'refine_script';
      if (/prompt/i.test(messageText)) intent = 'generate_prompt';
      if (/image/i.test(messageText)) intent = 'generate_image'; // Example for image generation intent
      // Add more sophisticated intent detection logic here if required

      // 2. Prepare attachment details (example: just URLs)
      const attachmentDetails = attachments.map(att => ({
        id: att.id,
        url: att.url, // Assuming attachments have a URL
        type: att.type // Assuming attachments have a type (e.g., 'image', 'video')
      }));

      // 3. Call the orchestrator function
      console.log(`[Roo Debug] Preparing to call request-router-orchestrator. Intent: ${intent}, ProjectId: ${options.projectId}, SceneId: ${options.sceneId}`);
      // console.log('[Roo Debug] currentThreadId (from state):', currentThreadId); // REMOVED: No longer managed here
      console.log(`[${new Date().toISOString()}] [handleSendMessage] INVOKING supabase function: request-router-orchestrator`); // <-- ADD THIS LOG
      const { data: orchestratorResponse, error: orchestratorError } = await supabase.functions.invoke(
        'request-router-orchestrator',
        {
          body: {
            intent: intent, // Send determined intent
            parameters: {
              userRequest: messageText, // Pass the original user message
              attachments: attachmentDetails, // Pass processed attachment info
              // Add other relevant parameters from the hook's state or options if needed
            },
            projectId: options.projectId,
            sceneId: options.sceneId, // Pass sceneId if available
            // threadId: currentThreadId, // REMOVED: Orchestrator handles thread lookup/creation
          },
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

      console.log('[Roo Debug] Orchestrator Response:', orchestratorResponse);

      // --- Process Orchestrator Response ---
      if (orchestratorResponse && orchestratorResponse.outcome) {
        // Extract potential thread ID returned by the backend (though we don't store it here anymore)
        // const receivedThreadId = orchestratorResponse.openai_thread_id; // Check if backend sends it back
        // console.log('[Roo Debug] Received threadId from backend:', receivedThreadId); // REMOVED: No longer needed

        // REMOVED: No longer managing threadId state in frontend
        // if (receivedThreadId && receivedThreadId !== currentThreadId) {
        //     console.log(`[Roo Debug] Updating currentThreadId state from ${currentThreadId} to ${receivedThreadId}`);
        //     setCurrentThreadId(receivedThreadId);
        // } else if (receivedThreadId && receivedThreadId === currentThreadId) {
        //     console.log(`[Roo Debug] Received threadId ${receivedThreadId} matches current state.`);
        // } else if (!receivedThreadId) {
        //     console.log(`[Roo Debug] No threadId received from backend.`);
        // }


        // Handle different types of outcomes (direct response, task ID, etc.)
        let assistantMessagesToAdd: Message[] = [];

        if (orchestratorResponse.outcome.taskId) {
          // Task was created, add a system message
          assistantMessagesToAdd.push({
            id: uuidv4(),
            role: 'system',
            content: `Task created successfully (ID: ${orchestratorResponse.outcome.taskId}). ${orchestratorResponse.actionTaken || ''}`,
            createdAt: new Date().toISOString(),
            type: 'system', // Use 'system' type for info messages
          });
        } else if (orchestratorResponse.outcome.script || orchestratorResponse.outcome.generatedPrompt || orchestratorResponse.outcome.message) {
           // Direct content response from an agent
           const content = orchestratorResponse.outcome.script || orchestratorResponse.outcome.generatedPrompt || orchestratorResponse.outcome.message || "Received response.";
           assistantMessagesToAdd.push({
             id: uuidv4(),
             role: 'assistant',
             content: content,
             createdAt: new Date().toISOString(),
             metadata: { // Include action taken for context
                 actionTaken: orchestratorResponse.actionTaken,
                 ...(orchestratorResponse.outcome.updatedTable && { updatedTable: orchestratorResponse.outcome.updatedTable }),
                 ...(orchestratorResponse.outcome.updatedId && { updatedId: orchestratorResponse.outcome.updatedId }),
                 ...(orchestratorResponse.outcome.updatedField && { updatedField: orchestratorResponse.outcome.updatedField }),
             }
           });
        } else {
             // Generic success message if no specific content but action was taken
             assistantMessagesToAdd.push({
               id: uuidv4(),
               role: 'system', // Or 'assistant' if preferred
               content: orchestratorResponse.actionTaken || 'Request processed successfully.',
               createdAt: new Date().toISOString(),
               type: 'system', // Use 'system' type for info messages
             });
        }

        // Add the assistant/system messages to the state
        if (assistantMessagesToAdd.length > 0) {
           console.log(`[Roo Debug] Adding ${assistantMessagesToAdd.length} assistant/system messages.`);
           setMessages(prev => [...prev, ...assistantMessagesToAdd]);
           // Update session context if applicable
           if (options.sessionId) {
             updateChatSession(options.sessionId, [...messagesBeforeAssistant, ...assistantMessagesToAdd]);
           }
        }

      } else if (orchestratorResponse && orchestratorResponse.error) {
         // Handle errors reported by the orchestrator/agent
         throw new Error(orchestratorResponse.error); // Throw the error message from the backend
      } else {
         // Handle unexpected response structure
         console.warn("Unexpected response structure from orchestrator:", orchestratorResponse);
         // Optionally add a generic system message
         const unexpectedResponseMessage: Message = {
           id: uuidv4(),
           role: 'system',
           content: 'Received an unexpected response from the server.',
           createdAt: new Date().toISOString(),
           type: 'system', // Use 'system' type for warning messages
         };
         setMessages(prev => [...prev, unexpectedResponseMessage]);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessageContent = error instanceof Error ? error.message : "An unknown error occurred.";
      const errorMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Error: ${errorMessageContent}`,
        createdAt: new Date().toISOString(),
        type: "error",
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error(`Error: ${errorMessageContent}`);
    } finally {
      setIsLoading(false);
      processingRef.current = false;
      submissionIdRef.current = null;
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [
      isLoading,
      messages,
      options.projectId,
      options.sceneId,
      options.sessionId,
      updateChatSession,
      supabase, // Add supabase as dependency
      canvasAgent, // <-- Add canvasAgent dependency
      projectContext.projectDetails // <-- Use CORRECT dependency
      // currentThreadId, // REMOVED: No longer managed here
  ]);

  // Function to send admin messages (if needed, otherwise remove)
  const sendAdminMessage = async (message: string) => {
      if (options.projectId !== "admin") {
          console.warn("Attempted to send admin message outside of admin project.");
          return;
      }
      const adminMsg: Message = {
          id: uuidv4(),
          role: "user", // Or a specific admin role?
          content: message,
          createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, adminMsg]);
      // No AI call for admin chat
  };


  return {
    messages,
    setMessages, // Expose setMessages if external updates are needed
    input,
    setInput,
    isLoading,
    handleSubmit,
    clearChat,
    addAttachments,
    removeAttachment,
    pendingAttachments,
    agentInstructions, // Keep if UI uses them
    updateAgentInstructions, // Keep if UI uses them
    getAgentInstructions, // Keep if UI uses them
    userCredits, // Keep if UI uses them
    tracingEnabled, // Keep if UI uses them
    toggleTracing, // Keep if UI uses them
    sendAdminMessage, // Keep if admin chat feature is used
    // currentThreadId, // REMOVED: No longer managed here
  };
}
