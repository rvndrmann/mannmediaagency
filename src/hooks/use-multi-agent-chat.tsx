
import { useState, useCallback, useEffect } from "react";
import { Message, Attachment, HandoffRequest } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { supabase } from "@/integrations/supabase/client";
import { AgentRunner } from "@/hooks/multi-agent/runner/AgentRunner";
import { CanvasProject } from "@/types/canvas";

// Correctly re-export the type using export type
export type { AgentType } from "@/hooks/multi-agent/runner/types";

interface UseMultiAgentChatOptions {
  initialMessages?: Message[];
  onAgentSwitch?: (from: string, to: string) => void;
  projectId?: string;
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
  const [currentProject, setCurrentProject] = useState<CanvasProject | null>(null);
  const [agentInstructions, setAgentInstructions] = useState<Record<string, string>>({
    main: "You are a helpful AI assistant focused on general tasks.",
    script: options.projectId 
      ? "You specialize in writing scripts for video projects. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it. You can save scripts directly to Canvas projects."
      : "You specialize in writing scripts and creative content. When asked for a script, you MUST provide one, not just talk about it.",
    image: "You specialize in creating detailed image prompts.",
    tool: "You specialize in executing tools and technical tasks.",
    scene: options.projectId
      ? "You specialize in creating detailed visual scene descriptions for video projects. You can save scene descriptions and image prompts directly to Canvas projects."
      : "You specialize in creating detailed visual scene descriptions."
  });
  
  // Update project context
  const setProjectContext = useCallback((project: CanvasProject) => {
    setCurrentProject(project);
    
    // Update script agent instructions with project context
    setAgentInstructions(prev => ({
      ...prev,
      script: `You specialize in writing scripts for video projects. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it. You're currently working on the Canvas project "${project.title}" (ID: ${project.id}).
You can use the canvas tool to save scripts directly to the project.`,
      scene: `You specialize in creating detailed visual scene descriptions for video projects. You can provide detailed image prompts that will generate compelling visuals for each scene. You're currently working on the Canvas project "${project.title}" (ID: ${project.id}).
You can use the canvas tool to save scene descriptions and image prompts directly to the project.`
    }));
    
    // Add a system message about project context
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
      // Don't add duplicate system messages about the same project
      if (prev.some(m => m.role === "system" && m.content.includes(`Working with Canvas project: ${project.title}`))) {
        return prev;
      }
      return [...prev, systemMessage];
    });
    
  }, []);
  
  // Fetch user credits
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
  
  // Handle project ID from options
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
              voice_over_url, background_music_url, duration, created_at, updated_at
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
              duration: scene.duration,
              createdAt: scene.created_at,
              updatedAt: scene.updated_at
            }))
          };
          
          setCurrentProject(project);
          
          // Update script agent instructions with project context
          setAgentInstructions(prev => ({
            ...prev,
            script: `You specialize in writing scripts for video projects. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it. You're currently working on the Canvas project "${project.title}" (ID: ${project.id}).
You can use the canvas tool to save scripts directly to the project.`,
            scene: `You specialize in creating detailed visual scene descriptions for video projects. You can provide detailed image prompts that will generate compelling visuals for each scene. You're currently working on the Canvas project "${project.title}" (ID: ${project.id}).
You can use the canvas tool to save scene descriptions and image prompts directly to the project.`
          }));
          
        } catch (error) {
          console.error("Error fetching project:", error);
        }
      };
      
      fetchProjectDetails();
    }
  }, [options.projectId]);
  
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
  
  // Process handoff between agents
  const processHandoff = async (
    fromAgent: AgentType, 
    toAgent: AgentType, 
    reason: string, 
    preserveFullHistory: boolean = true,
    additionalContext: Record<string, any> = {}
  ) => {
    setHandoffInProgress(true);
    
    try {
      // Include project ID in continuity data if available
      if (currentProject) {
        additionalContext.projectId = currentProject.id;
        additionalContext.projectTitle = currentProject.title;
      }
      
      // Create continuity data to maintain context between agents
      const continuityData = {
        fromAgent,
        toAgent,
        reason,
        timestamp: new Date().toISOString(),
        preserveHistory: preserveFullHistory,
        additionalContext
      };
      
      // Add system message about handoff with enhanced context
      const handoffMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Conversation transferred from ${getAgentName(fromAgent)} to ${getAgentName(toAgent)}. Reason: ${reason}`,
        createdAt: new Date().toISOString(),
        type: "handoff",
        continuityData
      };
      
      setMessages(prev => [...prev, handoffMessage]);
      
      // Change the active agent
      switchAgent(toAgent);
      
      // Short delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHandoffInProgress(false);
      
      return true;
    } catch (error) {
      console.error("Error processing handoff:", error);
      setHandoffInProgress(false);
      return false;
    }
  };
  
  // Enhanced message sending function with real API calls
  const sendMessage = async (message: string, agentId?: AgentType) => {
    setIsLoading(true);
    
    try {
      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        content: message,
        role: "user",
        createdAt: new Date().toISOString(),
        attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Generate unique IDs for the conversation group and this run
      const groupId = uuidv4();
      const runId = uuidv4();
      
      // Helper function for sending messages from the agent
      const addMessage = (text: string, type: string, attachments?: Attachment[]) => {
        const newMessage: Message = {
          id: uuidv4(),
          content: text,
          role: "assistant",
          createdAt: new Date().toISOString(),
          agentType: activeAgent,
          type: type as MessageType,
          attachments
        };
        
        setMessages(prev => [...prev, newMessage]);
        return newMessage;
      };
      
      // Helper function to check if a tool is available
      const toolAvailable = (toolName: string) => {
        // Simple implementation - in a real app, you'd check against available tools
        return true;
      };
      
      // Create the agent runner
      const currentAgent = agentId || activeAgent;
      const runner = new AgentRunner(
        currentAgent, 
        {
          supabase,
          groupId,
          runId,
          userId: user.id,
          usePerformanceModel,
          enableDirectToolExecution,
          tracingDisabled: !tracingEnabled,
          addMessage,
          toolAvailable,
          metadata: {
            conversationHistory: messages,
            instructions: agentInstructions[currentAgent],
            projectId: currentProject?.id || options.projectId, // Pass the project ID to the agent
            projectDetails: currentProject, // Pass full project details
          }
        },
        {
          onMessage: (newMessage: Message) => {
            // Only add the message to our state if it's not already there
            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          },
          onHandoffStart: (fromAgent: string, toAgent: string, reason: string) => {
            console.log(`Starting handoff from ${fromAgent} to ${toAgent}: ${reason}`);
            setHandoffInProgress(true);
          },
          onHandoffEnd: (toAgent: string) => {
            console.log(`Handoff completed to ${toAgent}`);
            setActiveAgent(toAgent as AgentType);
            setHandoffInProgress(false);
          },
          onToolExecution: (toolName: string, params: any) => {
            console.log(`Executing tool: ${toolName}`, params);
          },
          onError: (error: string) => {
            toast.error(error);
            setIsLoading(false);
          }
        }
      );
      
      try {
        // Run the agent with the user's message
        await runner.run(message, pendingAttachments, user.id);
      } catch (error) {
        console.error("Error in agent execution:", error);
        toast.error("Error processing your message. Please try again.");
      }
      
      setIsLoading(false);
      
    } catch (error) {
      console.error("Error in sendMessage:", error);
      toast.error("Failed to send message");
      setIsLoading(false);
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
    currentProject,
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
    sendMessage,
    processHandoff,
    setProjectContext
  };
}
