
import { useState, useCallback, useEffect, useRef } from "react";
import { Message, Attachment, HandoffRequest, MessageType } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { supabase } from "@/integrations/supabase/client";
import { AgentRunner } from "@/hooks/multi-agent/runner/AgentRunner";
import { CanvasProject } from "@/types/canvas";
import { useChatSession } from "@/contexts/ChatSessionContext";

export type { AgentType } from "@/hooks/multi-agent/runner/types";

interface UseMultiAgentChatOptions {
  initialMessages?: Message[];
  onAgentSwitch?: (from: string, to: string) => void;
  projectId?: string;
  sessionId?: string;
}

export function useMultiAgentChat(options: UseMultiAgentChatOptions = {}) {
  const { 
    activeSession, 
    activeChatId, 
    getOrCreateChatSession, 
    updateChatSession 
  } = useChatSession();
  
  const [chatSessionId, setChatSessionId] = useState<string | null>(
    options.sessionId || (options.projectId ? null : activeChatId)
  );
  
  const [messages, setMessages] = useState<Message[]>(
    options.initialMessages || (activeSession?.messages || [])
  );
  
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>({ credits_remaining: 100 });
  const [usePerformanceModel, setUsePerformanceModel] = useState<boolean>(false);
  const [enableDirectToolExecution, setEnableDirectToolExecution] = useState<boolean>(false);
  const [tracingEnabled, setTracingEnabled] = useState<boolean>(true); // Default to true for fixing issues
  const [handoffInProgress, setHandoffInProgress] = useState<boolean>(false);
  const [currentProject, setCurrentProject] = useState<CanvasProject | null>(null);
  
  // Enhanced refs for handling debouncing and preventing duplicate submissions
  const lastSubmissionTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const processingTimeoutRef = useRef<number | null>(null);
  const submissionIdRef = useRef<string | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set(messages.map(m => m.id))); // Track processed message IDs
  
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({
    main: "You are a helpful AI assistant focused on general tasks. You can help users with their Canvas video projects by accessing scene content including scripts, image prompts, scene descriptions, and voice over text.",
    script: options.projectId 
      ? "You specialize in writing scripts for video projects. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it. You can see and edit scripts directly in Canvas projects. You can extract, view, and edit the full script, image prompts, scene descriptions, and voice over text for any scene."
      : "You specialize in writing scripts and creative content. When asked for a script, you MUST provide one, not just talk about it. You can extract, view, and edit scripts for video projects.",
    image: "You specialize in creating detailed image prompts. You can see, create, and edit image prompts for scenes in Canvas projects. You can also view the full script, scene descriptions, and voice over text to ensure your image prompts match the overall content.",
    tool: "You specialize in executing tools and technical tasks. You can use the canvas_content tool to view and edit content in Canvas scenes, including scripts, image prompts, scene descriptions, and voice over text.",
    scene: options.projectId
      ? "You specialize in creating detailed visual scene descriptions for video projects. You can see and edit scene descriptions, image prompts, scripts, and voice over text directly in Canvas projects. When creating scene descriptions, focus on visual details that would be important for image generation."
      : "You specialize in creating detailed visual scene descriptions. Your descriptions can be used to inform image prompts and video creation. You can extract, view, and edit scene content for video projects."
  });
  
  useEffect(() => {
    if (!chatSessionId && options.projectId) {
      const newSessionId = getOrCreateChatSession(
        options.projectId, 
        options.initialMessages || []
      );
      setChatSessionId(newSessionId);
    }
  }, [options.projectId, options.initialMessages, chatSessionId, getOrCreateChatSession]);
  
  useEffect(() => {
    if (chatSessionId && messages.length > 0) {
      updateChatSession(chatSessionId, messages);
    }
  }, [messages, chatSessionId, updateChatSession]);
  
  const setProjectContext = useCallback((project: CanvasProject) => {
    setCurrentProject(project);
    
    setAgentInstructions(prev => ({
      ...prev,
      script: `You specialize in writing scripts for video projects. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it. You're currently working on the Canvas project "${project.title}" (ID: ${project.id}).
You can use the canvas tool to save scripts directly to the project.`,
      scene: `You specialize in creating detailed visual scene descriptions for video projects. You can provide detailed image prompts that will generate compelling visuals for each scene. You're currently working on the Canvas project "${project.title}" (ID: ${project.id}).
You can use the canvas tool to save scene descriptions and image prompts directly to the project.`
    }));
    
    const systemMessage: Message = {
      id: uuidv4(),
      role: "system",
      content: `Working with Canvas project: ${project.title} (ID: ${project.id})
Project contains ${project.scenes.length} scenes.
${project.fullScript ? "This project has a full script." : "This project does not have a full script yet."}`,
      createdAt: new Date().toISOString(),
      type: "system"
    };
    
    setMessages(prev => {
      if (prev.some(m => m.role === "system" && m.content.includes(`Working with Canvas project: ${project.title}`))) {
        return prev;
      }
      return [...prev, systemMessage];
    });
  }, []);
  
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
    if (options.projectId) {
      const fetchProjectDetails = async () => {
        try {
          const { data, error } = await supabase
            .from('canvas_projects')
            .select('*')
            .eq('id', options.projectId)
            .single();
            
          if (error) throw error;
          
          const { data: scenesData, error: scenesError } = await supabase
            .from('canvas_scenes')
            .select(`
              id, project_id, title, scene_order, script, description, 
              image_prompt, image_url, product_image_url, video_url, 
              voice_over_url, voice_over_text, background_music_url, duration, created_at, updated_at
            `)
            .eq('project_id', options.projectId)
            .order('scene_order', { ascending: true });
            
          if (scenesError) throw scenesError;
          
          const project: CanvasProject = {
            id: data.id,
            title: data.title,
            description: data.description || "",
            fullScript: data.full_script || "",
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            userId: data.user_id,
            scenes: scenesData.map(scene => ({
              id: scene.id,
              projectId: scene.project_id,
              title: scene.title,
              order: scene.scene_order,
              script: scene.script || "",
              description: scene.description || "", 
              imagePrompt: scene.image_prompt || "",
              imageUrl: scene.image_url || "",
              productImageUrl: scene.product_image_url || "",
              videoUrl: scene.video_url || "",
              voiceOverUrl: scene.voice_over_url || "", 
              backgroundMusicUrl: scene.background_music_url || "",
              voiceOverText: scene.voice_over_text || "", 
              duration: scene.duration,
              createdAt: scene.created_at,
              updatedAt: scene.updated_at
            }))
          };
          
          setCurrentProject(project);
          
          // Update agent instructions with project details
          setAgentInstructions(prev => ({
            ...prev,
            script: `You specialize in writing scripts for video projects. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it. You're currently working on the Canvas project "${project.title}" (ID: ${project.id})${project.fullScript ? ". This project already has a script that you should reference and modify as needed." : "."} 
You can use the canvas tool to save scripts directly to the project.`,
            scene: `You specialize in creating detailed visual scene descriptions for video projects. You can provide detailed image prompts that will generate compelling visuals for each scene. You're currently working on the Canvas project "${project.title}" (ID: ${project.id})"${project.fullScript ? ", which already has a script you should reference." : "."}
You can use the canvas tool to save scene descriptions and image prompts directly to the project.`
          }));
          
          console.log("Project details loaded:", {
            id: project.id,
            title: project.title,
            hasScript: !!project.fullScript,
            scenesCount: project.scenes.length
          });
          
        } catch (error) {
          console.error("Error fetching project:", error);
        }
      };
      
      fetchProjectDetails();
    }
  }, [options.projectId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      default: return "Assistant";
    }
  };
  
  const clearChat = () => {
    setMessages([]);
    messageIdsRef.current.clear(); // Clear message IDs tracking
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
  
  const processHandoff = async (
    fromAgent: AgentType, 
    toAgent: AgentType, 
    reason: string, 
    preserveFullHistory: boolean = true,
    additionalContext: Record<string, any> = {}
  ) => {
    setHandoffInProgress(true);
    
    try {
      if (currentProject) {
        additionalContext.projectId = currentProject.id;
        additionalContext.projectTitle = currentProject.title;
        additionalContext.existingScript = currentProject.fullScript;
      }
      
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
        type: "handoff",
        continuityData
      };
      
      // Track the handoff message ID
      messageIdsRef.current.add(handoffMessage.id);
      
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
        messageIdsRef.current.add(timeoutErrorId);
        
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
      
      // Check if we already have this exact message (prevent double submits)
      const duplicateMessage = messages.find(m => 
        m.role === 'user' && 
        m.content === messageText &&
        Date.now() - new Date(m.createdAt).getTime() < 5000
      );
      
      if (duplicateMessage) {
        console.log("Prevented duplicate message - exact same content found", messageText.substring(0, 20));
        processingRef.current = false;
        setIsLoading(false);
        submissionIdRef.current = null;
        return;
      }
      
      // Create user message with the generated ID
      const userMessage: Message = {
        id: messageId,
        role: "user",
        content: messageText,
        createdAt: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      // Add the message ID to our tracking set
      messageIdsRef.current.add(messageId);
      
      console.log("Adding user message with ID:", messageId, "tracking", messageIdsRef.current.size, "messages");
      
      // Add user message to chat history - only if not already present
      setMessages(prev => {
        // Final check to ensure we don't add it again
        if (prev.some(m => m.id === messageId)) {
          console.log("Prevented adding duplicate user message with ID:", messageId);
          return prev;
        }
        return [...prev, userMessage];
      });
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to chat with agents");
        return;
      }
      
      // Create unique IDs for this conversation
      const runId = uuidv4();
      const groupId = chatSessionId || uuidv4();
      
      // Run the agent with a properly defined toolAvailable function
      const runner = new AgentRunner(
        activeAgent,
        {
          supabase,
          userId: user.id,
          usePerformanceModel,
          enableDirectToolExecution,
          tracingDisabled: !tracingEnabled,
          metadata: {
            projectId: options.projectId,
            projectDetails: currentProject,
            groupId: groupId,
            conversationHistory: [...messages, userMessage]
          },
          runId,
          groupId,
          addMessage: (text: string, type: string, msgAttachments?: Attachment[]) => {
            console.log(`Adding message: ${text.substring(0, 50)}...`);
          },
          toolAvailable: (toolName: string) => {
            return true; // All tools are available
          }
        },
        {
          onMessage: (message: Message) => {
            // Only add the message if we're still processing this submission
            // and haven't seen this message ID already
            if (submissionIdRef.current !== submissionId) {
              console.log("Ignoring message for different submission ID:", message.id);
              return;
            }
            
            if (messageIdsRef.current.has(message.id)) {
              console.log("Prevented duplicate message with ID:", message.id);
              return;
            }
            
            // Add the ID to our tracking set
            messageIdsRef.current.add(message.id);
            console.log("Adding message with ID:", message.id, "tracking", messageIdsRef.current.size, "messages");
            
            // Look for any almost identical messages that might have been added very recently
            let isDuplicate = false;
            setMessages(prev => {
              // Double-check again to prevent race conditions
              if (prev.some(m => m.id === message.id)) {
                console.log("Prevented duplicate message (already in state):", message.id);
                isDuplicate = true;
                return prev;
              }
              
              // Check for almost identical messages (same role, content, created in last 3 seconds)
              const similarMessage = prev.find(m => 
                m.role === message.role && 
                m.content === message.content &&
                Date.now() - new Date(m.createdAt).getTime() < 3000
              );
              
              if (similarMessage) {
                console.log("Prevented duplicate message (similar content):", message.id);
                isDuplicate = true;
                return prev;
              }
              
              return [...prev, message];
            });
            
            if (isDuplicate) return;
            
            // If this is an agent response with a handoff request, update the active agent
            if (
              message.role === 'assistant' && 
              message.handoffRequest && 
              message.handoffRequest.targetAgent
            ) {
              const from = activeAgent;
              const to = message.handoffRequest.targetAgent as AgentType;
              
              console.log(`Handoff from ${from} to ${to}`);
              setHandoffInProgress(true);
              
              // Set the new active agent
              setActiveAgent(to);
              
              // Call the onAgentSwitch callback if provided
              if (options.onAgentSwitch) {
                options.onAgentSwitch(from, to);
              }
              
              // Finished handoff process
              setTimeout(() => {
                setHandoffInProgress(false);
              }, 500);
            }
          },
          onError: (errorMessage: string) => {
            // Only add the error if we're still processing this submission
            if (submissionIdRef.current === submissionId) {
              // Generate a unique ID for the error message
              const errorId = uuidv4();
              messageIdsRef.current.add(errorId);
              
              // Add error message
              const errorMsg: Message = {
                id: errorId,
                role: 'system',
                content: `Error: ${errorMessage}`,
                createdAt: new Date().toISOString(),
                type: 'error',
                status: 'error'
              };
              
              setMessages(prev => [...prev, errorMsg]);
              toast.error("Error processing your request");
            }
          },
          onHandoffStart: (from: AgentType, to: AgentType, reason: string) => {
            if (submissionIdRef.current === submissionId) {
              console.log(`Handoff starting from ${from} to ${to}: ${reason}`);
              setHandoffInProgress(true);
            }
          },
          onHandoffEnd: (agent: AgentType) => {
            if (submissionIdRef.current === submissionId) {
              console.log(`Handoff completed to ${agent}`);
              setHandoffInProgress(false);
            }
          },
          onToolExecution: (toolName: string, params: any) => {
            if (submissionIdRef.current === submissionId) {
              console.log(`Executing tool: ${toolName}`, params);
            }
          }
        }
      );
      
      await runner.run(messageText, attachments, user.id);
      
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      
      // Only show error if we're still processing this submission
      if (submissionIdRef.current === submissionId) {
        toast.error("Failed to process message");
        
        // Add error message to chat
        const errorId = uuidv4();
        messageIdsRef.current.add(errorId);
        
        const errorMsg: Message = {
          id: errorId,
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : "An unknown error occurred"}`,
          createdAt: new Date().toISOString(),
          type: 'error',
          status: 'error'
        };
        
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      // Only reset state if we're still processing this submission
      if (submissionIdRef.current === submissionId) {
        setIsLoading(false);
        setPendingAttachments([]);
        processingRef.current = false;
        submissionIdRef.current = null;
        
        // Clear the safety timeout
        if (processingTimeoutRef.current) {
          window.clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
      }
    }
  }, [
    activeAgent, 
    isLoading, 
    chatSessionId, 
    usePerformanceModel, 
    enableDirectToolExecution, 
    tracingEnabled,
    currentProject,
    options.projectId,
    options.onAgentSwitch,
    messages
  ]);

  const addAttachment = (attachment: Attachment) => {
    setPendingAttachments(prev => [...prev, attachment]);
  };

  const clearAttachments = () => {
    setPendingAttachments([]);
  };

  const clearMessages = () => {
    setMessages([]);
    // Also clear the message ID tracking set
    messageIdsRef.current.clear();
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    activeAgent,
    setActiveAgent,
    pendingAttachments,
    userCredits,
    usePerformanceModel,
    setUsePerformanceModel,
    enableDirectToolExecution,
    setEnableDirectToolExecution,
    tracingEnabled,
    setTracingEnabled,
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
    setProjectContext,
    chatSessionId,
    processHandoff,
    addAttachment,
    clearAttachments,
    clearMessages
  };
}
