
import { useState, useCallback, useEffect } from "react"; // Added useEffect
import { useCanvasAgentMCP } from "./use-canvas-agent-mcp";
import { useCanvasMessages } from "./use-canvas-messages";
import { toast } from "sonner";
import { Message } from "@/types/message";
import { SceneUpdateType, CanvasScene } from "@/types/canvas"; // Added CanvasScene
// OpenAI import is no longer needed here
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

// Remove OpenAI client initialization and sleep function

interface UpdateSceneFunction {
  (sceneId: string, type: SceneUpdateType, value: string): Promise<void>;
}

interface UseCanvasAgentProps {
  projectId?: string;
  sceneId?: string;
  updateScene?: UpdateSceneFunction;
}

/**
 * Main hook for Canvas Agent functionality
 */
export function useCanvasAgent(props: UseCanvasAgentProps) {
  const { projectId, sceneId, updateScene } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  
  // Use the Canvas Messages hook for message management
  const { 
    messages, 
    addAgentMessage, 
    addUserMessage, 
    addSystemMessage, 
    clearMessages 
  } = useCanvasMessages ? useCanvasMessages() : {
    messages: [],
    addAgentMessage: (type: string, content: string, sceneId?: string) => {},
    addUserMessage: (content: string) => {},
    addSystemMessage: (content: string) => {},
    clearMessages: () => {}
  };
  
  // Use the MCP integration hook
  const agentMcp = useCanvasAgentMCP ? useCanvasAgentMCP({
    projectId,
    sceneId,
    updateScene
  }) : {
    isProcessing: false,
    activeAgent: null,
    generateSceneScript: async () => false,
    generateSceneDescription: async () => false,
    generateImagePrompt: async () => false,
    generateSceneImage: async () => false,
    generateSceneVideo: async () => false
  };
  
  // Generate scene script with message handling
  const generateSceneScript = useCallback(async (sceneId: string, context?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate script");
      return false;
    }
    
    setIsLoading(true);
    setActiveAgent("script-generator");
    
    try {
      if (context) {
        addUserMessage(`Generate scene script with context: ${context}`);
      } else {
        addUserMessage("Generate scene script");
      }
      
      const success = await agentMcp.generateSceneScript(sceneId, context);
      
      if (success) {
        addAgentMessage(
          "script", 
          "Scene script generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate scene script");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating scene script:", error);
      addSystemMessage("Error generating scene script");
      toast.error("Failed to generate scene script");
      return false;
    } finally {
      setIsLoading(false);
      setActiveAgent(null);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  // Enhance the MCP methods with message handling
  const generateSceneDescription = useCallback(async (sceneId: string, context?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate description");
      return false;
    }
    
    setIsLoading(true);
    setActiveAgent("description-generator");
    
    try {
      if (context) {
        addUserMessage(`Generate scene description with context: ${context}`);
      } else {
        addUserMessage("Generate scene description");
      }
      
      const success = await agentMcp.generateSceneDescription(sceneId, context);
      
      if (success) {
        addAgentMessage(
          "description", 
          "Scene description generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate scene description");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating scene description:", error);
      addSystemMessage("Error generating scene description");
      toast.error("Failed to generate scene description");
      return false;
    } finally {
      setIsLoading(false);
      setActiveAgent(null);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  // Update function signature to accept scene data directly
  const generateImagePrompt = useCallback(async (
    sceneId: string,
    sceneScript: string,
    voiceOverText: string,
    customInstruction?: string,
    context?: string // Keep context if still needed for other purposes
  ): Promise<boolean> => {
      // Validate inputs
      if (!sceneId) {
          toast.error("Scene ID is required.");
          return false;
      }
      if (!sceneScript && !voiceOverText) {
           toast.error("Scene script or voice-over text is required to generate prompt.");
           return false;
      }
      // No OpenAI client check needed
       if (!updateScene) {
          toast.error("Update scene function not available.");
          return false;
      }

      setIsLoading(true);
      setActiveAgent("image-prompt-generator");
      addUserMessage(`Generating image prompt for scene ${sceneId} via Edge Function...`); // Keep user message

      try {
          // Log the data being sent
          console.log(`[useCanvasAgent] Calling generate-image-prompt Edge Function for sceneId: ${sceneId}`);

          // Call the Supabase Edge Function
          const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
              'generate-image-prompt', // Name of the Edge Function
              {
                  // Pass script, voice-over, and instruction directly
                  body: {
                      sceneScript,
                      voiceOverText,
                      customInstruction,
                      context // Pass context if needed by function/prompt
                  },
              }
          );

          if (functionError) {
              console.error("Edge function 'generate-image-prompt' invocation error:", functionError);
              let detailMessage = functionError.message;
              try {
                  // Attempt to parse context for more detailed error from the function
                  const ctx = JSON.parse(functionError.context || '{}');
                  if (ctx.error) detailMessage = ctx.error;
              } catch(e) { /* Ignore parsing error */ }
              // Check specifically for 404 which we were diagnosing
              if (functionError.message.includes('404')) {
                 detailMessage = "Edge Function endpoint not found (404). Please verify deployment.";
              }
              throw new Error(`Failed to call AI service: ${detailMessage}`);
          }

          // Process the successful response
          const generatedPrompt = functionResponse?.imagePrompt;

          if (!generatedPrompt || typeof generatedPrompt !== 'string') {
              console.error("Invalid response structure from 'generate-image-prompt' Edge function:", functionResponse);
              throw new Error("Invalid image prompt format received from AI service.");
          }

          // Update the scene with the generated prompt
          await updateScene(sceneId, 'imagePrompt', generatedPrompt);

          addAgentMessage("image", `Generated Image Prompt: ${generatedPrompt}`, sceneId);
          toast.success("Image prompt generated successfully!");
          return true;

      } catch (error: unknown) { // Explicitly type error
          console.error("Error generating image prompt:", error); // Log the caught error
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          addSystemMessage(`Error generating image prompt: ${errorMessage}`);
          toast.error(`Failed to generate image prompt: ${errorMessage}`);
          return false;
      } finally {
          setIsLoading(false);
          setActiveAgent(null);
      }
  // Update dependencies - remove projectId if no longer directly used here
  }, [updateScene, addAgentMessage, addUserMessage, addSystemMessage]);
  
  const generateSceneImage = useCallback(async (sceneId: string, imagePrompt?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate image");
      return false;
    }
    
    setIsLoading(true);
    setActiveAgent("image-generator");
    
    try {
      if (imagePrompt) {
        addUserMessage(`Generate scene image with prompt: ${imagePrompt}`);
      } else {
        addUserMessage("Generate scene image");
      }
      
      const success = await agentMcp.generateSceneImage(sceneId, imagePrompt);
      
      if (success) {
        addAgentMessage(
          "image", 
          "Scene image generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate scene image");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating scene image:", error);
      addSystemMessage("Error generating scene image");
      toast.error("Failed to generate scene image");
      return false;
    } finally {
      setIsLoading(false);
      setActiveAgent(null);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  const generateSceneVideo = useCallback(async (sceneId: string, description?: string): Promise<boolean> => {
    if (!sceneId) {
      toast.error("Scene ID is required to generate video");
      return false;
    }
    
    setIsLoading(true);
    setActiveAgent("video-generator");
    
    try {
      if (description) {
        addUserMessage(`Generate scene video with description: ${description}`);
      } else {
        addUserMessage("Generate scene video");
      }
      
      const success = await agentMcp.generateSceneVideo(sceneId, description);
      
      if (success) {
        addAgentMessage(
          "video", 
          "Scene video generated successfully.", 
          sceneId
        );
      } else {
        addSystemMessage("Failed to generate scene video");
      }
      
      return success;
    } catch (error) {
      console.error("Error generating scene video:", error);
      addSystemMessage("Error generating scene video");
      toast.error("Failed to generate scene video");
      return false;
    } finally {
      setIsLoading(false);
      setActiveAgent(null);
    }
  }, [projectId, agentMcp, addAgentMessage, addUserMessage, addSystemMessage]);
  
  const generateFullScript = useCallback(async (context: string): Promise<boolean> => {
    if (!projectId) {
      toast.error("Project ID is required to generate full script");
      return false;
    }
    
    setIsLoading(true);
    setActiveAgent("script-generator");
    
    try {
      addUserMessage(`Generate full script with context: ${context}`);
      
      // In a real implementation, this would call a script generation service
      setTimeout(() => {
        addAgentMessage(
          "script", 
          "Full script generation would be implemented here. This is a placeholder for the actual implementation.",
          sceneId
        );
      }, 1500);
      
      return true;
    } catch (error) {
      console.error("Error generating full script:", error);
      addSystemMessage("Error generating full script");
      toast.error("Failed to generate full script");
      return false;
    } finally {
      setIsLoading(false);
      setActiveAgent(null);
    }
  }, [projectId, sceneId, addAgentMessage, addUserMessage, addSystemMessage]);
  
  return {
    ...agentMcp,
    isLoading,
    activeAgent,
    messages,
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    generateFullScript,
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    clearMessages
  };
}
