
import React, { createContext, useContext, ReactNode } from "react";
import { useCanvasAgentMcp } from "@/hooks/use-canvas-agent-mcp";
import { MCPProvider } from "@/contexts/MCPContext";

// Create a context type for Canvas MCP
interface CanvasMcpContextType {
  activeAgent: string | null;
  isProcessing: boolean;
  isMcpEnabled: boolean;
  isMcpConnected: boolean;
  isGeneratingDescription: boolean;
  isGeneratingImagePrompt: boolean;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  toggleMcp: () => void;
  generateSceneDescription: (sceneId: string, context?: string) => Promise<boolean>;
  generateImagePrompt: (sceneId: string, context?: string) => Promise<boolean>;
  generateSceneImage: (sceneId: string, imagePrompt?: string) => Promise<boolean>;
  generateSceneVideo: (sceneId: string, description?: string) => Promise<boolean>;
}

// Create the context
const CanvasMcpContext = createContext<CanvasMcpContextType | undefined>(undefined);

interface CanvasMcpProviderProps {
  children: ReactNode;
  projectId: string;
  sceneId?: string;
  updateScene?: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video', value: string) => Promise<void>;
}

export function CanvasMcpProvider({ 
  children, 
  projectId, 
  sceneId,
  updateScene 
}: CanvasMcpProviderProps) {
  // Use the Canvas agent MCP hook
  const canvasAgentMcp = useCanvasAgentMcp({
    projectId,
    sceneId,
    updateScene
  });
  
  return (
    <MCPProvider projectId={projectId}>
      <CanvasMcpContext.Provider value={canvasAgentMcp}>
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
