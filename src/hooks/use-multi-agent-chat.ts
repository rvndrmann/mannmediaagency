
import { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment } from "@/types/message";
import { toast } from "sonner";
import { AgentRunner } from "@/hooks/multi-agent/runner/AgentRunner";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useChatSession } from "@/contexts/ChatSessionContext";

export type AgentType = "main" | "script" | "image" | "tool" | "scene" | string;

interface UseMultiAgentChatProps {
  projectId?: string;
  sessionId?: string;
}

export function useMultiAgentChat({ projectId, sessionId }: UseMultiAgentChatProps = {}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  const [usePerformanceModel, setUsePerformanceModel] = useState(true);
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState(false);
  const [tracingEnabled, setTracingEnabled] = useState(true);
  const [handoffInProgress, setHandoffInProgress] = useState(false);
  const [agentInstructions, setAgentInstructions] = useLocalStorage<Record<string, string>>(
    "agent-instructions",
    {
      main: "You are the Main Assistant, a helpful AI that can assist with a wide range of tasks. You know when to delegate to specialist agents.",
      script: "You are the Script Writer, specialized in creating compelling scripts for videos, ads, and other content. You excel at storytelling and dialogue.",
      image: "You are the Image Generator, specialized in creating detailed image prompts that can be used to generate high-quality images.",
      tool: "You are the Tool Agent, specialized in using various tools to accomplish tasks that require external data or actions.",
      scene: "You are the Scene Creator, specialized in creating detailed scene descriptions for videos, including visual elements, camera angles, and mood.",
    }
  );
  
  // Get chat session context
  const { updateChatSession, getOrCreateChatSession } = useChatSession();
  
  // Create a reference to the agent runner
  const agentRunnerRef = useRef<AgentRunner | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Store the current session ID
  const currentSessionId = useRef<string | null>(null);
  
  // Set up connection retry state
  const retryTimeoutRef = useRef<number | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxConnectionAttempts = 3;
  
  // Function to get or create a session ID
  const ensureSessionId = useCallback(() => {
    if (sessionId) {
      currentSessionId.current = sessionId;
      return sessionId;
    }
    
    if (currentSessionId.current) {
      return currentSessionId.current;
    }
    
    try {
      const newSessionId = getOrCreateChatSession(projectId || null);
      currentSessionId.current = newSessionId;
      return newSessionId;
    } catch (error) {
      console.error("Error creating chat session:", error);
      toast.error("Failed to create chat session");
      throw error;
    }
  }, [sessionId, projectId, getOrCreateChatSession]);

  // Initialize agent runner and load messages
  useEffect(() => {
    isMountedRef.current = true;
    
    // Function to load chat history
    const loadChat = async () => {
      try {
        const sid = ensureSessionId();
        
        // Create an instance of the AgentRunner
        if (!agentRunnerRef.current) {
          const userId = (await supabase.auth.getUser()).data.user?.id || "anonymous";
          const groupId = uuidv4();
          
          agentRunnerRef.current = new AgentRunner(
            activeAgent,
            {
              supabase,
              groupId,
              runId: uuidv4(),
              userId,
              projectId,
              usePerformanceModel,
              enableDirectToolExecution,
              tracingDisabled: !tracingEnabled,
              metadata: {
                conversationHistory: [],
              },
              addMessage: () => {},
              toolAvailable: () => true,
              creditsRemaining: userCredits?.credits_remaining || 0
            },
            {
              onMessage: (message) => {
                if (isMountedRef.current) {
                  setMessages(prev => {
                    // Check if message already exists (by ID) to prevent duplicates
                    if (prev.some(m => m.id === message.id)) {
                      return prev.map(m => m.id === message.id ? message : m);
                    }
                    return [...prev, message];
                  });
                }
              },
              onError: (error) => {
                if (isMountedRef.current) {
                  toast.error(`Error: ${error}`);
                  setIsLoading(false);
                  
                  // Add error message to chat
                  const errorMessage: Message = {
                    id: uuidv4(),
                    role: "system",
                    content: `Error: ${error}`,
                    createdAt: new Date().toISOString(),
                    type: "error",
                    status: "error"
                  };
                  
                  setMessages(prev => [...prev, errorMessage]);
                }
              },
              onHandoffStart: (fromAgent, toAgent, reason) => {
                if (isMountedRef.current) {
                  setHandoffInProgress(true);
                  console.log(`Handoff started from ${fromAgent} to ${toAgent}: ${reason}`);
                }
              },
              onHandoffEnd: (agentType) => {
                if (isMountedRef.current) {
                  setHandoffInProgress(false);
                  console.log(`Handoff completed to ${agentType}`);
                }
              },
              onToolExecution: (toolName, params) => {
                console.log(`Tool execution: ${toolName}`, params);
              }
            }
          );
        }
        
        // Load and set chat messages
        const { activeSession } = useChatSession.getState();
        if (activeSession && activeSession.id === sid) {
          console.log(`Loading chat session ${sid} with ${activeSession.messages.length} messages`);
          if (isMountedRef.current) {
            setMessages(activeSession.messages);
            
            // Update the agent runner's metadata with conversation history
            if (agentRunnerRef.current) {
              agentRunnerRef.current.context.metadata.conversationHistory = activeSession.messages;
            }
          }
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        if (isMountedRef.current) {
          toast.error("Failed to load chat session");
        }
      }
    };
    
    // Function to load user credits
    const loadUserCredits = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;
        
        const { data: credits, error } = await supabase
          .from("user_credits")
          .select("credits_remaining")
          .eq("user_id", userData.user.id)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (isMountedRef.current) {
          setUserCredits(credits);
          
          // Update agent runner with current credits
          if (agentRunnerRef.current) {
            agentRunnerRef.current.context.creditsRemaining = credits.credits_remaining;
          }
        }
      } catch (error) {
        console.error("Error loading user credits:", error);
      }
    };
    
    loadChat();
    loadUserCredits();
    
    // Clean up function
    return () => {
      isMountedRef.current = false;
      
      // Clear any pending timeout
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [projectId, activeAgent, ensureSessionId, usePerformanceModel, enableDirectToolExecution, tracingEnabled, userCredits?.credits_remaining]);
  
  // Update chat session when messages change
  useEffect(() => {
    const sid = currentSessionId.current;
    if (sid && messages.length > 0) {
      updateChatSession(sid, messages);
    }
  }, [messages, updateChatSession]);

  // Handle message submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() && pendingAttachments.length === 0) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        toast.error("You must be signed in to use the chat");
        setIsLoading(false);
        return;
      }
      
      // Check if user has sufficient credits
      if (!userCredits || userCredits.credits_remaining < 0.07) {
        toast.error("Insufficient credits. Please add more credits to continue.");
        setIsLoading(false);
        return;
      }
      
      // Create a unique message ID for tracking
      const messageId = uuidv4();
      console.log(`Adding user message with ID: ${messageId} tracking ${messages.length} messages`);
      
      // Add user message to UI immediately
      const userMessage: Message = {
        id: messageId,
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
        attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Clear input and attachments
      setInput("");
      setPendingAttachments([]);
      
      // Deduct credits
      await supabase.rpc("safely_decrease_chat_credits", { credit_amount: 0.07 });
      
      // Refresh user credits
      const { data: updatedCredits } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", userId)
        .single();
        
      if (updatedCredits) {
        setUserCredits(updatedCredits);
      }
      
      // Update the agent runner with latest conversation history
      if (agentRunnerRef.current) {
        // Process the user's message with the agent
        try {
          await agentRunnerRef.current.run(input, pendingAttachments, userId);
          // Reset connection attempts on successful message
          setConnectionAttempts(0);
        } catch (error) {
          console.error("Error running agent:", error);
          
          // Handle retry logic for connection issues
          if (connectionAttempts < maxConnectionAttempts) {
            setConnectionAttempts(prev => prev + 1);
            
            // Add a system message about retry
            const retryMessage: Message = {
              id: uuidv4(),
              role: "system",
              content: `Connection issue detected. Retrying (${connectionAttempts + 1}/${maxConnectionAttempts})...`,
              createdAt: new Date().toISOString(),
              type: "system",
              status: "working"
            };
            
            setMessages(prev => [...prev, retryMessage]);
            
            // Retry with exponential backoff
            const backoffTime = Math.pow(2, connectionAttempts) * 1000;
            retryTimeoutRef.current = window.setTimeout(async () => {
              try {
                await agentRunnerRef.current?.run(input, pendingAttachments, userId);
                
                // Update retry message to success
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === retryMessage.id 
                      ? {...msg, content: "Connection restored!", status: "completed"} 
                      : msg
                  )
                );
                
                setConnectionAttempts(0);
              } catch (retryError) {
                console.error("Retry failed:", retryError);
                
                // Update retry message to failure
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === retryMessage.id 
                      ? {...msg, content: "Connection failed. Please try again later.", status: "error"} 
                      : msg
                  )
                );
                
                toast.error(
                  connectionAttempts >= maxConnectionAttempts - 1
                    ? "Failed to connect after multiple attempts. Please check your internet connection."
                    : "Connection issue persists. Retrying..."
                );
              } finally {
                retryTimeoutRef.current = null;
              }
            }, backoffTime);
            
          } else {
            toast.error("Failed to connect after multiple attempts. Please try again later.");
          }
          
          throw error; // Re-throw to indicate failure to the caller
        }
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      
      // Specific error handling can be added here
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("timeout")) {
          toast.error("Network error. Please check your connection and try again.");
        } else {
          toast.error(`Error: ${error.message}`);
        }
      } else {
        toast.error("An unknown error occurred");
      }
      
      throw error; // Re-throw to the caller
    } finally {
      setIsLoading(false);
    }
  }, [input, pendingAttachments, userCredits, messages.length, connectionAttempts]);

  // Switch agent
  const switchAgent = useCallback((agentType: AgentType) => {
    setActiveAgent(agentType);
    
    // Update the agent runner with the new agent type
    if (agentRunnerRef.current) {
      // Create a new instance with the new agent type
      const userId = agentRunnerRef.current.context.userId;
      const groupId = agentRunnerRef.current.context.groupId;
      
      agentRunnerRef.current = new AgentRunner(
        agentType,
        {
          ...agentRunnerRef.current.context,
          metadata: {
            ...agentRunnerRef.current.context.metadata,
            previousAgentType: activeAgent
          }
        },
        agentRunnerRef.current.callbacks
      );
      
      // Add a system message about the agent switch
      const switchMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Switched to ${agentType} agent`,
        createdAt: new Date().toISOString(),
        type: "system"
      };
      
      setMessages(prev => [...prev, switchMessage]);
    }
    
    toast.success(`Switched to ${agentType} agent`);
  }, [activeAgent]);

  // Clear chat
  const clearChat = useCallback(() => {
    // Create a new session
    try {
      const newSessionId = getOrCreateChatSession(projectId || null);
      currentSessionId.current = newSessionId;
      
      // Reset messages
      setMessages([]);
      
      // Reset agent runner
      if (agentRunnerRef.current) {
        const userId = agentRunnerRef.current.context.userId;
        
        agentRunnerRef.current = new AgentRunner(
          activeAgent,
          {
            ...agentRunnerRef.current.context,
            groupId: uuidv4(),
            runId: uuidv4(),
            metadata: {
              conversationHistory: []
            }
          },
          agentRunnerRef.current.callbacks
        );
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  }, [projectId, activeAgent, getOrCreateChatSession]);

  // Add attachments
  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  }, []);

  // Update agent instructions
  const updateAgentInstructions = useCallback((agentType: AgentType, instructions: string) => {
    setAgentInstructions(prev => ({
      ...prev,
      [agentType]: instructions
    }));
    
    toast.success(`Updated ${agentType} agent instructions`);
  }, [setAgentInstructions]);

  // Get agent instructions
  const getAgentInstructions = useCallback((agentType: AgentType) => {
    return agentInstructions[agentType] || "";
  }, [agentInstructions]);

  // Toggle performance mode
  const togglePerformanceMode = useCallback(() => {
    setUsePerformanceModel(prev => !prev);
    
    // Update the agent runner
    if (agentRunnerRef.current) {
      agentRunnerRef.current.context.usePerformanceModel = !usePerformanceModel;
    }
    
    toast.success(`Switched to ${!usePerformanceModel ? "performance" : "high quality"} mode`);
  }, [usePerformanceModel]);

  // Toggle direct tool execution
  const toggleDirectToolExecution = useCallback(() => {
    setEnableDirectToolExecution(prev => !prev);
    
    // Update the agent runner
    if (agentRunnerRef.current) {
      agentRunnerRef.current.context.enableDirectToolExecution = !enableDirectToolExecution;
    }
    
    toast.success(`${!enableDirectToolExecution ? "Enabled" : "Disabled"} direct tool execution`);
  }, [enableDirectToolExecution]);

  // Toggle tracing
  const toggleTracing = useCallback(() => {
    setTracingEnabled(prev => !prev);
    
    // Update the agent runner
    if (agentRunnerRef.current) {
      agentRunnerRef.current.context.tracingDisabled = tracingEnabled;
    }
    
    toast.success(`${!tracingEnabled ? "Enabled" : "Disabled"} tracing`);
  }, [tracingEnabled]);

  // Set project context
  const setProjectContext = useCallback((newProjectId: string | null) => {
    // This function would be called when switching projects
    // Create a new session for the new project
    if (newProjectId !== projectId) {
      try {
        const newSessionId = getOrCreateChatSession(newProjectId);
        currentSessionId.current = newSessionId;
        
        // Reset messages and add a system message
        setMessages([{
          id: uuidv4(),
          role: "system",
          content: newProjectId 
            ? `Switched to project: ${newProjectId}` 
            : "Project context removed",
          createdAt: new Date().toISOString(),
          type: "system"
        }]);
        
        // Update agent runner
        if (agentRunnerRef.current) {
          agentRunnerRef.current.context.projectId = newProjectId || undefined;
          agentRunnerRef.current.context.metadata.conversationHistory = [];
        }
        
        toast.success(newProjectId 
          ? `Switched to project: ${newProjectId}` 
          : "Project context removed"
        );
      } catch (error) {
        console.error("Error setting project context:", error);
        toast.error("Failed to switch projects");
      }
    }
  }, [projectId, getOrCreateChatSession]);

  return {
    input,
    setInput,
    messages,
    setMessages,
    isLoading,
    pendingAttachments,
    userCredits,
    activeAgent,
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
    setProjectContext
  };
}
