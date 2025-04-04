
import { useState, useCallback, useEffect, useRef } from "react"; // Added useEffect, useRef
import { useCanvasAgentMCP } from "./use-canvas-agent-mcp";
import { useCanvasMessages } from "./use-canvas-messages";
import { toast } from "sonner";
import { Message } from "@/types/message";
import { SceneUpdateType, CanvasScene, AdminSceneUpdate } from "@/types/canvas"; // Use AdminSceneUpdate here
// OpenAI import is no longer needed here
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"; // Import RealtimePostgresChangesPayload

// Remove OpenAI client initialization and sleep function

interface UpdateSceneFunction {
  (sceneId: string, type: SceneUpdateType, value: string | null): Promise<void>;
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
  const adminUpdatesChannelRef = useRef<RealtimeChannel | null>(null); // Ref for realtime channel

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

  // --- User Modification Functions ---

  const updateSceneField = useCallback(async (
    sceneId: string,
    field: SceneUpdateType,
    value: string,
    fieldName: string // User-friendly name for messages
  ): Promise<boolean> => {
    if (!sceneId) {
      toast.error(`Scene ID is required to update ${fieldName}.`);
      return false;
    }
    if (!updateScene) {
      toast.error("Update scene function not available.");
      return false;
    }

    // Add user message simulation if needed, or just proceed
    // addUserMessage(`Updating ${fieldName} for scene ${sceneId}...`);
    console.log(`Updating ${fieldName} for scene ${sceneId}`);

    try {
      await updateScene(sceneId, field, value);
      addSystemMessage(`${fieldName} for scene ${sceneId} updated successfully.`);
      toast.success(`${fieldName} updated.`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error(`Error updating ${fieldName}:`, error);
      addSystemMessage(`Error updating ${fieldName}: ${errorMessage}`);
      toast.error(`Failed to update ${fieldName}: ${errorMessage}`);
      return false;
    }
  }, [updateScene, addSystemMessage, addUserMessage]);

  const updateSceneScript = useCallback((sceneId: string, newScript: string) => {
    return updateSceneField(sceneId, 'script', newScript, 'script');
  }, [updateSceneField]);

  const updateSceneVoiceover = useCallback((sceneId: string, newVoiceover: string) => {
    return updateSceneField(sceneId, 'voiceOverText', newVoiceover, 'voiceover text');
  }, [updateSceneField]);

  const updateSceneImagePrompt = useCallback((sceneId: string, newPrompt: string) => {
    // Note: 'imagePrompt' matches the column name added in the migration
    return updateSceneField(sceneId, 'imagePrompt', newPrompt, 'image prompt');
  }, [updateSceneField]);

  const updateSceneDescription = useCallback((sceneId: string, newDescription: string) => {
    return updateSceneField(sceneId, 'description', newDescription, 'description');
  }, [updateSceneField]);


  // --- Admin Update Handling (Supabase Realtime) ---

  useEffect(() => {
    // Ensure we have a project ID to filter updates
    // Also check if supabase client is available
    if (!projectId || !supabase) {
       console.log("Admin updates: Missing projectId or Supabase client.");
      return;
    }

    const handleAdminUpdate = (payload: RealtimePostgresChangesPayload<AdminSceneUpdate>) => { // Use correct payload type
      console.log('Admin update received:', payload);
      const { new: updateRecord } = payload;

      if (!updateRecord) return;

      // Fetch project details to confirm ownership before processing
      supabase
        .from('canvas_scenes')
        .select('project_id')
        .eq('id', updateRecord.scene_id)
        .single()
        .then(({ data: sceneData, error }) => {
          if (error || !sceneData || sceneData.project_id !== projectId) {
             if(error) console.error("Error fetching scene for admin update check:", error);
             else console.log("Admin update ignored, scene not part of current project:", updateRecord.scene_id);
            return; // Ignore update if scene doesn't belong to the current project
          }

          // Format message based on update type
          let messageContent = `An administrator updated the ${updateRecord.update_type} for scene ${updateRecord.scene_id}.`;
          if (updateRecord.update_content) {
            // Keep it concise for the chat
             const displayContent = updateRecord.update_content.length > 50
                ? `${updateRecord.update_content.substring(0, 50)}...`
                : updateRecord.update_content;
            messageContent += ` New value: "${displayContent}"`;
          }

          // Add a system message to the chat
          addSystemMessage(messageContent);
          toast.info(`Admin update received for scene ${updateRecord.scene_id}`);
        });
    };

    // Subscribe to inserts on the admin_scene_updates table
    const channel = supabase
      .channel(`admin_updates_for_project_${projectId}`)
      .on<AdminSceneUpdate>( // Use the table record type as the generic
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_scene_updates',
        },
        (payload) => handleAdminUpdate(payload as RealtimePostgresChangesPayload<AdminSceneUpdate>) // Cast payload if needed, or TS might infer correctly
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to admin updates for project ${projectId}`);
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Admin updates subscription error for project ${projectId}:`, status, err);
            toast.error("Realtime connection error for admin updates.");
         } else {
            console.log(`Admin updates subscription status for project ${projectId}: ${status}`);
         }
      });

    adminUpdatesChannelRef.current = channel;

    // Cleanup function
    return () => {
      if (adminUpdatesChannelRef.current) {
        console.log(`Unsubscribing from admin updates for project ${projectId}`);
        supabase.removeChannel(adminUpdatesChannelRef.current)
          .then(status => console.log("Admin updates unsubscribe status:", status))
          .catch(error => console.error("Error unsubscribing from admin updates:", error));
        adminUpdatesChannelRef.current = null;
      }
    };
    // Dependencies: projectId, supabase client instance, addSystemMessage
  }, [projectId, supabase, addSystemMessage]);


  return {
    ...agentMcp,
    isLoading,
    activeAgent,
    messages,
    // Generation functions
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    generateFullScript,
    // User modification functions
    updateSceneScript,
    updateSceneVoiceover,
    updateSceneImagePrompt,
    updateSceneDescription,
    // Message functions
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    clearMessages
  };
}

// Add the AdminSceneUpdatePayload type to canvas types if it doesn't exist
// Example in "@/types/canvas.ts":
/*
export interface AdminSceneUpdate {
  id: string;
  scene_id: string;
  admin_user_id: string;
  update_type: string;
  update_content?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSceneUpdatePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: AdminSceneUpdate | null;
  old_record: AdminSceneUpdate | null;
  new: AdminSceneUpdate; // Specifically for INSERT
}
*/
