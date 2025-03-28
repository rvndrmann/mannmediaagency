
import { useState, useEffect, useCallback } from "react";
import { SceneUpdateType } from "@/types/canvas";
import { Message } from "@/types/message";
import { toast } from "sonner";

type CanvasAgentContext = {
  projectId: string;
  sceneId?: string;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
};

type AgentType = "script" | "image" | "description";

export function useCanvasAgent({
  projectId,
  sceneId,
  updateScene,
  saveFullScript,
  divideScriptToScenes
}: CanvasAgentContext) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentMessages, setAgentMessages] = useState<Message[]>([]);
  
  // Process responses based on agent type
  const processAgentRequest = useCallback(async (
    userInput: string, 
    context: {
      projectTitle: string;
      sceneTitle?: string;
      sceneId?: string;
    },
    agentType: AgentType
  ) => {
    if (!projectId) {
      toast.error("Project ID is required");
      return;
    }
    
    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: userInput,
      role: "user",
      createdAt: new Date().toISOString()
    };
    
    setAgentMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate response based on agent type
      let response = "";
      
      switch (agentType) {
        case "script":
          response = generateScriptResponse(userInput, context);
          // Check if we need to update a scene script or full script
          if (context.sceneId && sceneId) {
            await updateScene(sceneId, "script", extractScript(response));
          } else {
            // This would be for full script
            const fullScript = extractScript(response);
            if (fullScript) {
              await saveFullScript(fullScript);
            }
          }
          break;
          
        case "image":
          response = generateImagePromptResponse(userInput, context);
          if (context.sceneId && sceneId) {
            await updateScene(sceneId, "imagePrompt", extractImagePrompt(response));
          }
          break;
          
        case "description":
          response = generateDescriptionResponse(userInput, context);
          if (context.sceneId && sceneId) {
            await updateScene(sceneId, "description", extractDescription(response));
          }
          break;
      }
      
      // Add AI response to the chat
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        agentType: agentType,
        createdAt: new Date().toISOString()
      };
      
      setAgentMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("Failed to process your request");
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, sceneId, updateScene, saveFullScript, divideScriptToScenes]);
  
  // Helper functions to generate dummy responses
  const generateScriptResponse = (input: string, context: any) => {
    return `I've created a script for your scene "${context.sceneTitle || "New Scene"}":
    
**Script:**
This is a beautiful shot of our product being used in a natural setting. The lighting is warm and inviting, creating a cozy atmosphere. We see a person's hands gently holding the product, demonstrating its size and texture.

I've updated the scene script for you. Let me know if you need any adjustments!`;
  };
  
  const generateImagePromptResponse = (input: string, context: any) => {
    return `I've created an image prompt for your scene "${context.sceneTitle || "New Scene"}":
    
**Image Prompt:**
Close-up product photography of elegant perfume bottle, soft natural lighting, minimalist white background, professional product shot, high-end commercial photography, 8k, ultra-detailed.

I've updated the image prompt for this scene. This should help generate a beautiful product image.`;
  };
  
  const generateDescriptionResponse = (input: string, context: any) => {
    return `I've created a description for your scene "${context.sceneTitle || "New Scene"}":
    
**Description:**
This opening scene establishes the premium nature of our product with an elegant close-up shot. The minimalist white background emphasizes the product's design while the soft lighting creates a sense of luxury and refinement.

I've updated the scene description. This will help guide the visual direction for this part of your video.`;
  };
  
  // Helper functions to extract content from responses
  const extractScript = (response: string): string => {
    const scriptMatch = response.match(/\*\*Script:\*\*\s*([\s\S]*?)(?=\n\n|$)/);
    return scriptMatch ? scriptMatch[1].trim() : "";
  };
  
  const extractImagePrompt = (response: string): string => {
    const promptMatch = response.match(/\*\*Image Prompt:\*\*\s*([\s\S]*?)(?=\n\n|$)/);
    return promptMatch ? promptMatch[1].trim() : "";
  };
  
  const extractDescription = (response: string): string => {
    const descriptionMatch = response.match(/\*\*Description:\*\*\s*([\s\S]*?)(?=\n\n|$)/);
    return descriptionMatch ? descriptionMatch[1].trim() : "";
  };
  
  return {
    isProcessing,
    agentMessages,
    processAgentRequest
  };
}
