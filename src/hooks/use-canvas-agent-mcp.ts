
import { useState, useCallback } from 'react';
import { Message } from '@/types/message';
import { SceneUpdateType } from '@/types/canvas';
import { toast } from 'sonner';

interface UseCanvasAgentMCPProps {
  projectId?: string;
  sceneId?: string | null;
  updateScene?: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

export const useCanvasAgentMCP = ({
  projectId,
  sceneId,
  updateScene
}: UseCanvasAgentMCPProps) => {
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

  const addAgentMessage = useCallback((agentType: string, content: string, sceneId?: string): Message => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      role: 'assistant',
      agentType,
      sceneId,
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
    setIsProcessing(true);
    setActiveAgent('script');
    
    try {
      addSystemMessage(`Generating script for scene...${context ? '\n\nContext: ' + context : ''}`);
      
      // Mock script generation with delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generatedScript = `# Generated Script for Scene ${sceneId}

FADE IN:

INT. MODERN OFFICE - DAY

A sleek, minimalist office with glass walls and modern furniture. Natural light streams in through large windows.

NARRATOR (V.O.)
In today's fast-paced digital world, businesses need solutions that adapt quickly.

[Product shot: Show product in use in office setting]

NARRATOR (V.O.)
That's why we developed a system built for real-world challenges.

FADE OUT.`;
      
      // Update scene with generated script
      await updateScene(sceneId, 'script', generatedScript);
      
      // Add AI response message
      addAgentMessage('script', 'I\'ve created a professional script for your scene that includes camera directions and narration.', sceneId);
      
      return true;
    } catch (error) {
      console.error("Error generating scene script:", error);
      addAgentMessage('script', 'Sorry, I encountered an error while generating the script. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage]);

  const generateSceneDescription = useCallback(async (
    sceneId: string,
    context?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    setIsProcessing(true);
    setActiveAgent('description');
    
    try {
      addSystemMessage(`Generating scene description...${context ? '\n\nContext: ' + context : ''}`);
      
      // Mock description generation with delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generatedDescription = "A modern office interior with sleek furniture and natural lighting. The scene shows our product in use on a desk, with a person gesturing toward it confidently. The camera slowly pans from left to right, emphasizing the product's design and interface.";
      
      // Update scene with generated description
      await updateScene(sceneId, 'description', generatedDescription);
      
      // Add AI response message
      addAgentMessage('description', 'I\'ve created a detailed scene description that will help guide the visual creation process.', sceneId);
      
      return true;
    } catch (error) {
      console.error("Error generating scene description:", error);
      addAgentMessage('description', 'Sorry, I encountered an error while generating the description. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage]);

  const generateImagePrompt = useCallback(async (
    sceneId: string,
    context?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    setIsProcessing(true);
    setActiveAgent('imagePrompt');
    
    try {
      addSystemMessage(`Generating image prompt...${context ? '\n\nContext: ' + context : ''}`);
      
      // Mock image prompt generation with delay
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      const generatedImagePrompt = "Modern minimalist office interior, sleek glass desk, natural daylight streaming through large windows, elegant office chair, laptop computer displaying product interface, stylish desk lamp, professional atmosphere, 4K, photorealistic, cinematic lighting, depth of field";
      
      // Update scene with generated image prompt
      await updateScene(sceneId, 'imagePrompt', generatedImagePrompt);
      
      // Add AI response message
      addAgentMessage('imagePrompt', 'I\'ve created an optimized image prompt that will help generate a high-quality scene image.', sceneId);
      
      return true;
    } catch (error) {
      console.error("Error generating image prompt:", error);
      addAgentMessage('imagePrompt', 'Sorry, I encountered an error while generating the image prompt. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage]);

  const generateSceneImage = useCallback(async (
    sceneId: string,
    imagePrompt?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    setIsProcessing(true);
    setActiveAgent('image');
    
    try {
      addSystemMessage(`Generating scene image...${imagePrompt ? '\n\nUsing prompt: ' + imagePrompt : ''}`);
      
      // Mock image generation with delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In a real implementation, this would call an AI image generation service
      const mockImageUrl = "https://placehold.co/800x450?text=Generated+Scene+Image";
      
      // Update scene with generated image URL
      await updateScene(sceneId, 'image', mockImageUrl);
      
      // Add AI response message
      addAgentMessage('image', 'I\'ve generated a scene image based on your description and prompt.', sceneId);
      
      return true;
    } catch (error) {
      console.error("Error generating scene image:", error);
      addAgentMessage('image', 'Sorry, I encountered an error while generating the image. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage]);

  const generateSceneVideo = useCallback(async (
    sceneId: string,
    description?: string
  ): Promise<boolean> => {
    if (!projectId || !updateScene) return false;
    setIsProcessing(true);
    setActiveAgent('video');
    
    try {
      addSystemMessage(`Generating scene video...${description ? '\n\nBased on: ' + description : ''}`);
      
      // Mock video generation with delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // In a real implementation, this would call a video generation service
      const mockVideoUrl = "https://placehold.co/800x450/mp4?text=Generated+Scene+Video";
      
      // Update scene with generated video URL
      await updateScene(sceneId, 'video', mockVideoUrl);
      
      // Add AI response message
      addAgentMessage('video', 'I\'ve generated a video for your scene. You can preview it now.', sceneId);
      
      return true;
    } catch (error) {
      console.error("Error generating scene video:", error);
      addAgentMessage('video', 'Sorry, I encountered an error while generating the video. Please try again.', sceneId);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, updateScene, addSystemMessage, addAgentMessage]);

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
