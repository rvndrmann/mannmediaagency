
import React, { createContext, useContext, ReactNode, useCallback } from "react"; // Added useCallback
import { useCanvasMcp } from "@/hooks/use-canvas-mcp";
import { MCPProvider } from "@/contexts/MCPContext";
import { SceneUpdateType } from "@/types/canvas";

// Create a context type for Canvas MCP
interface CanvasMcpContextType {
  messages: any[];
  addUserMessage: (content: string) => any;
  addAssistantMessage: (content: string, metadataInfo?: any) => any;
  activeAgent: string | null;
  isProcessing: boolean;
  isMcpEnabled: boolean;
  isMcpConnected: boolean;
  isGeneratingDescription: boolean;
  isGeneratingImagePrompt: boolean;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isGeneratingScript: boolean;
  toggleMcp: () => void;
  generateSceneDescription: (sceneId: string, context?: string) => Promise<boolean>;
  generateImagePrompt: (sceneId: string, context?: string) => Promise<boolean>;
  generateSceneImage: (sceneId: string, imagePrompt?: string) => Promise<boolean>;
  generateSceneVideo: (sceneId: string, description?: string) => Promise<boolean>;
  generateSceneScript: (sceneId: string, context?: string) => Promise<boolean>;
  // Add update functions needed by useMultiAgentChat
  updateSceneScript: (sceneId: string, value: string) => Promise<boolean>;
  updateSceneVoiceover: (sceneId: string, value: string) => Promise<boolean>;
  updateSceneImagePrompt: (sceneId: string, value: string) => Promise<boolean>;
  updateSceneDescription: (sceneId: string, value: string) => Promise<boolean>;
}

// Create the context
const CanvasMcpContext = createContext<CanvasMcpContextType | undefined>(undefined);

interface UpdateSceneFunction {
  (sceneId: string, type: SceneUpdateType, value: string): Promise<void>;
}

interface CanvasMcpProviderProps {
  children: ReactNode;
  projectId: string;
  sceneId?: string;
  updateScene?: UpdateSceneFunction;
}

export function CanvasMcpProvider({ 
  children, 
  projectId, 
  sceneId,
  updateScene 
}: CanvasMcpProviderProps) {
  // Use the Canvas MCP hook
  const canvasMcp = useCanvasMcp({
    projectId,
    sceneId,
    updateScene
  });

  // --- Define Update Functions ---
  // Helper similar to useCanvasAgent's updateSceneField, but returns boolean for consistency
  const updateSceneField = useCallback(async (
    sceneId: string,
    field: SceneUpdateType,
    value: string,
    fieldName: string // User-friendly name for messages/errors
  ): Promise<boolean> => {
    if (!updateScene) {
      console.error(`Update scene function not available when trying to update ${fieldName}.`);
      // Consider using toast here if available/appropriate for context
      return false;
    }
    try {
      await updateScene(sceneId, field, value);
      // Optionally add success toast/log here if needed within context
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error(`Error updating ${fieldName} in CanvasMcpContext:`, error);
      // Optionally add error toast/log here
      return false;
    }
  }, [updateScene]); // Dependency on the passed updateScene function

  const updateSceneScript = useCallback((sceneId: string, newScript: string) => {
    return updateSceneField(sceneId, 'script', newScript, 'script');
  }, [updateSceneField]);

  const updateSceneVoiceover = useCallback((sceneId: string, newVoiceover: string) => {
    return updateSceneField(sceneId, 'voiceOverText', newVoiceover, 'voiceover text');
  }, [updateSceneField]);

  const updateSceneImagePrompt = useCallback((sceneId: string, newPrompt: string) => {
    return updateSceneField(sceneId, 'imagePrompt', newPrompt, 'image prompt');
  }, [updateSceneField]);

  const updateSceneDescription = useCallback((sceneId: string, newDescription: string) => {
    return updateSceneField(sceneId, 'description', newDescription, 'description');
  }, [updateSceneField]);

  // Combine hook results with the new update functions for the context value
  const contextValue = {
    ...canvasMcp,
    updateSceneScript,
    updateSceneVoiceover,
    updateSceneImagePrompt,
    updateSceneDescription,
  };
  
  return (
    <MCPProvider projectId={projectId}>
      {/* Provide the combined value */}
      <CanvasMcpContext.Provider value={contextValue}>
        {children}
      </CanvasMcpContext.Provider>
    </MCPProvider>
  );
}

// Export the hook for using the context
export function useCanvasMcpContext() {
  const context = useContext(CanvasMcpContext);
  if (context === undefined) {
    throw new Error("useCanvasMcpContext must be used within a CanvasMcpProvider");
  }
  return context;
}
