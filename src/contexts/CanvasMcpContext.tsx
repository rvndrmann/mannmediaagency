
import React, { createContext, useContext, ReactNode } from "react";
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
  
  return (
    <MCPProvider projectId={projectId}>
      <CanvasMcpContext.Provider value={canvasMcp}>
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
