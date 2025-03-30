
import { useState, useCallback } from "react";
import { useCanvasAgentMcp } from "./use-canvas-agent-mcp";
import { toast } from "sonner";

interface UseCanvasAgentProps {
  projectId?: string;
  sceneId?: string;
  updateScene?: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video', value: string) => Promise<void>;
}

/**
 * Main hook for Canvas Agent functionality
 */
export function useCanvasAgent(props: UseCanvasAgentProps) {
  const { projectId, sceneId, updateScene } = props;
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the MCP integration hook
  const agentMcp = useCanvasAgentMcp({
    projectId,
    sceneId,
    updateScene
  });
  
  // Add any additional Canvas agent functionality here
  const generateFullScript = useCallback(async (context: string): Promise<boolean> => {
    if (!projectId) {
      toast.error("Project ID is required to generate full script");
      return false;
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call a script generation service
      toast.info("Script generation would be implemented here");
      return true;
    } catch (error) {
      console.error("Error generating full script:", error);
      toast.error("Failed to generate full script");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);
  
  return {
    ...agentMcp,
    isLoading,
    generateFullScript
  };
}
