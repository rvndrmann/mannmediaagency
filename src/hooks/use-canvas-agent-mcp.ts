
import { useState, useCallback } from 'react';
import { Message } from '@/types/message';
import { MCPServerService } from '@/services/mcpService'; // Keep for type checking if needed, but instance comes from context
import { CanvasProject, SceneUpdateType } from '@/types/canvas'; // Add CanvasProject import
import { toast } from 'sonner';
import { useMCPContext } from '@/contexts/MCPContext'; // Import the context hook

interface UseCanvasAgentMCPProps {
  projectId?: string;
  project?: CanvasProject | null; // Add current project details
  projects?: CanvasProject[];    // Add list of all projects
  sceneId?: string | null;
  updateScene?: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  // Potentially add selectProject later:
  // selectProject?: (id: string) => void;
}

export const useCanvasAgentMCP = ({
  projectId,
  project, // Destructure new prop
  projects, // Destructure new prop
  sceneId,
  updateScene
}: UseCanvasAgentMCPProps) => {
  // Remove incorrect mcpService destructuring
  // Get callTool function and connection status from context
  const { callTool: contextCallTool, status: connectionStatus } = useMCPContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Helper functions
  const addMessageToState = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Define message addition functions
  const addUserMessage = useCallback((content: string): Message => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    return addMessageToState(message);
  }, [addMessageToState]);

  const addSystemMessage = useCallback((content: string): Message => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      role: 'system',
      createdAt: new Date().toISOString()
    };
    return addMessageToState(message);
  }, [addMessageToState]);

  const addAgentMessage = useCallback((agentType: string, content: string, messageSceneId?: string): Message => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      role: 'assistant',
      agentType,
      sceneId: messageSceneId,
      createdAt: new Date().toISOString()
    };
    return addMessageToState(message);
  }, [addMessageToState]);

  // Generation functions
  const generateSceneScript = useCallback(async (
    sceneId: string,
    context?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    // Correct connection check using context values
    if (connectionStatus !== 'connected' || !contextCallTool) {
      toast.error("MCP Service not connected. Cannot generate script.");
      addSystemMessage("Error: MCP Service not connected.");
      return false;
    }
    setIsProcessing(true);
    setActiveAgent('script');

    try {
      console.log('[useCanvasAgentMCP] Checking MCP connection before generating script...');
      console.log('[useCanvasAgentMCP] Connection status:', connectionStatus);
      addSystemMessage(`Generating script for scene...${context ? '\n\nContext: ' + context : ''}`);

      // Call MCP tool using the service from context
      
      const result = await contextCallTool('generate_scene_script', {
        projectId: projectId,
        sceneId: sceneId,
        contextPrompt: context,
        // Add project context
        projectContext: {
          currentProject: project,
          allProjects: projects,
        }
      });

      if (result.success && result.data?.script) {
        // Update scene with generated script
        await updateScene(sceneId, 'script', result.data.script);

        // Add AI response message
        addAgentMessage('script', 'I\'ve created a professional script for your scene that includes camera directions and narration.', sceneId);

        return true;
      } else {
        addSystemMessage(`Failed to generate scene script: ${result.data?.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error("Error generating scene script:", error);
      addAgentMessage('script', 'Sorry, I encountered an error while generating the script. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage, contextCallTool, connectionStatus, project, projects]);

  const generateSceneDescription = useCallback(async (
    sceneId: string,
    context?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    // Correct connection check using context values
    if (connectionStatus !== 'connected' || !contextCallTool) {
      toast.error("MCP Service not connected. Cannot generate description.");
      addSystemMessage("Error: MCP Service not connected.");
      return false;
    }
    setIsProcessing(true);
    setActiveAgent('description');

    try {
      console.log('[useCanvasAgentMCP] Checking MCP connection before generating description...');
      console.log('[useCanvasAgentMCP] Connection status:', connectionStatus);
      addSystemMessage(`Generating scene description...${context ? '\n\nContext: ' + context : ''}`);

      // Call MCP tool using the service from context
      const result = await contextCallTool('generate_scene_description', {
        projectId: projectId,
        sceneId: sceneId,
        useDescription: context, // Assuming context can be used as useDescription
        // Add project context
        projectContext: {
          currentProject: project,
          allProjects: projects,
        }
      });

      if (result.success && result.data?.result) {
        // Update scene with generated description
        await updateScene(sceneId, 'description', result.data.result);

        // Add AI response message
        addAgentMessage('description', 'I\'ve created a detailed scene description that will help guide the visual creation process.', sceneId);

        return true;
      } else {
        addSystemMessage(`Failed to generate scene description: ${result.data?.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error("Error generating scene description:", error);
      addAgentMessage('description', 'Sorry, I encountered an error while generating the description. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage, contextCallTool, connectionStatus, project, projects]);

  const generateImagePrompt = useCallback(async (
    sceneId: string,
    context?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    // Correct connection check using context values
    if (connectionStatus !== 'connected' || !contextCallTool) {
      toast.error("MCP Service not connected. Cannot generate image prompt.");
      addSystemMessage("Error: MCP Service not connected.");
      return false;
    }
    setIsProcessing(true);
    setActiveAgent('imagePrompt');

    try {
      console.log('[useCanvasAgentMCP] Checking MCP connection before generating image prompt...');
      console.log('[useCanvasAgentMCP] Connection status:', connectionStatus);
      addSystemMessage(`Generating image prompt...${context ? '\n\nContext: ' + context : ''}`);

      // Call MCP tool using the service from context
      const result = await contextCallTool('generate_image_prompt', {
        projectId: projectId,
        sceneId: sceneId,
        imageAnalysis: context, // Assuming context can be used as imageAnalysis
        // Add project context
        projectContext: {
          currentProject: project,
          allProjects: projects,
        }
      });

      if (result.success && result.data?.prompt) {
        // Update scene with generated image prompt
        await updateScene(sceneId, 'imagePrompt', result.data.prompt);

        // Add AI response message
        addAgentMessage('imagePrompt', 'I\'ve created an optimized image prompt that will help generate a high-quality scene image.', sceneId);

        return true;
      } else {
        addSystemMessage(`Failed to generate image prompt: ${result.data?.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error("Error generating image prompt:", error);
      addAgentMessage('imagePrompt', 'Sorry, I encountered an error while generating the image prompt. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage, contextCallTool, connectionStatus, project, projects]);

  const generateSceneImage = useCallback(async (
    sceneId: string,
    imagePrompt?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    // Correct connection check using context values
    if (connectionStatus !== 'connected' || !contextCallTool) {
      toast.error("MCP Service not connected. Cannot generate scene image.");
      addSystemMessage("Error: MCP Service not connected.");
      return false;
    }
    setIsProcessing(true);
    setActiveAgent('image');

    try {
      console.log('[useCanvasAgentMCP] Checking MCP connection before generating scene image...');
      console.log('[useCanvasAgentMCP] Connection status:', connectionStatus);
      addSystemMessage(`Generating scene image...${imagePrompt ? '\n\nUsing prompt: ' + imagePrompt : ''}`);

      // Call MCP tool using the service from context
      const result = await contextCallTool('generate_scene_image', {
        projectId: projectId,
        sceneId: sceneId,
        imagePrompt: imagePrompt,
        // Add project context
        projectContext: {
          currentProject: project,
          allProjects: projects,
        }
      });

      if (result.success && result.data?.imageUrl) {
        // Update scene with generated image URL
        await updateScene(sceneId, 'image', result.data.imageUrl);

        // Add AI response message
        addAgentMessage('image', 'I\'ve generated a scene image based on your description and prompt.', sceneId);

        return true;
      } else {
        addSystemMessage(`Failed to generate scene image: ${result.data?.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error("Error generating scene image:", error);
      addAgentMessage('image', 'Sorry, I encountered an error while generating the image. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage, contextCallTool, connectionStatus, project, projects]);

  const generateSceneVideo = useCallback(async (
    sceneId: string,
    description?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    // Correct connection check using context values
    if (connectionStatus !== 'connected' || !contextCallTool) {
      toast.error("MCP Service not connected. Cannot generate scene video.");
      addSystemMessage("Error: MCP Service not connected.");
      return false;
    }
    setIsProcessing(true);
    setActiveAgent('video');

    try {
      console.log('[useCanvasAgentMCP] Checking MCP connection before generating scene video...');
      console.log('[useCanvasAgentMCP] Connection status:', connectionStatus);
      addSystemMessage(`Generating scene video...${description ? '\n\nBased on: ' + description : ''}`);

      // Call MCP tool using the service from context
      const result = await contextCallTool('generate_scene_video', {
        projectId: projectId,
        sceneId: sceneId,
        aspectRatio: '16:9', // You might want to make this configurable
        // Add project context
        projectContext: {
          currentProject: project,
          allProjects: projects,
        }
      });

      if (result.success && result.data?.videoUrl) {
        // Update scene with generated video URL
        await updateScene(sceneId, 'video', result.data.videoUrl);

        // Add AI response message
        addAgentMessage('video', 'I\'ve generated a video for your scene. You can preview it now.', sceneId);

        return true;
      } else {
        addSystemMessage(`Failed to generate scene video: ${result.data?.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error("Error generating scene video:", error);
      addAgentMessage('video', 'Sorry, I encountered an error while generating the video. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage, contextCallTool, connectionStatus, project, projects]);

  return {
    isProcessing,
    activeAgent,
    messages,
    addUserMessage,
    addSystemMessage,
    addAgentMessage,
    clearMessages,
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo
  };
};
