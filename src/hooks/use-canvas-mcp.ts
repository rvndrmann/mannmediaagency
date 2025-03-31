
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMCPContext } from '@/contexts/MCPContext';
import { toast } from 'sonner';
import { SceneUpdateType } from '@/types/canvas';

interface UseCanvasMcpOptions {
  projectId?: string;
  sceneId?: string;
  updateScene?: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

interface MessageMetadata {
  type?: string;
  sceneId?: string;
  generated?: {
    type: string;
    content: string;
  };
}

export interface CanvasMcpMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: MessageMetadata;
  agentType?: string;
}

export const useCanvasMcp = ({
  projectId,
  sceneId,
  updateScene
}: UseCanvasMcpOptions) => {
  const [messages, setMessages] = useState<CanvasMcpMessage[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>('main');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Specific generation states
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
  const { 
    useMcp,
    setUseMcp,
    isConnecting,
    hasConnectionError,
    reconnectToMcp,
    connectionStatus
  } = useMCPContext();
  
  const isMcpConnected = connectionStatus === 'connected';
  
  // Initialize with a system message
  useEffect(() => {
    if (projectId && messages.length === 0) {
      const welcomeMessage: CanvasMcpMessage = {
        id: uuidv4(),
        role: 'system',
        content: `Welcome to Canvas AI Assistant. I can help you create content for your video project.`,
        createdAt: new Date().toISOString()
      };
      
      setMessages([welcomeMessage]);
    }
  }, [projectId, messages.length]);
  
  // Toggle MCP connection
  const toggleMcp = useCallback(() => {
    setUseMcp(!useMcp);
  }, [useMcp, setUseMcp]);
  
  // Add user message
  const addUserMessage = useCallback((content: string) => {
    const message: CanvasMcpMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, message]);
    return message;
  }, []);
  
  // Add assistant message
  const addAssistantMessage = useCallback((content: string, metadataInfo?: MessageMetadata) => {
    const message: CanvasMcpMessage = {
      id: uuidv4(),
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
      metadata: metadataInfo,
      agentType: activeAgent || 'main'
    };
    
    setMessages(prev => [...prev, message]);
    return message;
  }, [activeAgent]);

  // Generic function to handle MCP tool execution
  const executeMcpTool = useCallback(async (
    toolId: string, 
    params: any, 
    setLoadingState: (state: boolean) => void,
    successMessage: string,
    errorMessage: string
  ) => {
    if (!projectId) {
      toast.error("No project selected");
      return false;
    }
    
    if (isProcessing) {
      toast.error("Another operation is in progress. Please wait.");
      return false;
    }
    
    setIsProcessing(true);
    setLoadingState(true);
    
    try {
      if (!isMcpConnected) {
        const reconnected = await reconnectToMcp();
        if (!reconnected) {
          throw new Error("Failed to connect to MCP server");
        }
      }
      
      // Call the MCP tool
      // This is a mock implementation - replace with actual MCP client call
      console.log(`Executing MCP tool: ${toolId} with params:`, params);
      
      // Simulate success after 2 seconds for testing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate a response
      const result = {
        success: true,
        data: { content: `Generated content for ${toolId}` }
      };
      
      if (result.success) {
        toast.success(successMessage);
        return true;
      } else {
        throw new Error(result.data?.content || "Tool execution failed");
      }
    } catch (error) {
      console.error(`Error executing ${toolId}:`, error);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsProcessing(false);
      setLoadingState(false);
    }
  }, [projectId, isProcessing, isMcpConnected, reconnectToMcp]);
  
  // Generate scene description
  const generateSceneDescription = useCallback(async (sceneId: string, context?: string) => {
    if (!updateScene) return false;
    
    return executeMcpTool(
      'generate_scene_description',
      { projectId, sceneId, context },
      setIsGeneratingDescription,
      "Scene description generated",
      "Failed to generate scene description"
    );
  }, [projectId, executeMcpTool, updateScene]);
  
  // Generate image prompt
  const generateImagePrompt = useCallback(async (sceneId: string, context?: string) => {
    if (!updateScene) return false;
    
    return executeMcpTool(
      'generate_image_prompt',
      { projectId, sceneId, context },
      setIsGeneratingImagePrompt,
      "Image prompt generated",
      "Failed to generate image prompt"
    );
  }, [projectId, executeMcpTool, updateScene]);
  
  // Generate scene image
  const generateSceneImage = useCallback(async (sceneId: string, imagePrompt?: string) => {
    if (!updateScene) return false;
    
    return executeMcpTool(
      'generate_scene_image',
      { projectId, sceneId, imagePrompt },
      setIsGeneratingImage,
      "Scene image generated",
      "Failed to generate scene image"
    );
  }, [projectId, executeMcpTool, updateScene]);
  
  // Generate scene video
  const generateSceneVideo = useCallback(async (sceneId: string, description?: string) => {
    if (!updateScene) return false;
    
    return executeMcpTool(
      'generate_scene_video',
      { projectId, sceneId, description },
      setIsGeneratingVideo,
      "Scene video generated",
      "Failed to generate scene video"
    );
  }, [projectId, executeMcpTool, updateScene]);
  
  // Generate scene script
  const generateSceneScript = useCallback(async (sceneId: string, context?: string) => {
    if (!updateScene) return false;
    
    return executeMcpTool(
      'generate_scene_script',
      { projectId, sceneId, context },
      setIsGeneratingScript,
      "Scene script generated",
      "Failed to generate scene script"
    );
  }, [projectId, executeMcpTool, updateScene]);
  
  return {
    messages,
    addUserMessage,
    addAssistantMessage,
    activeAgent,
    isProcessing,
    isMcpEnabled: useMcp,
    isMcpConnected,
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    isGeneratingScript,
    toggleMcp,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    generateSceneScript
  };
};
