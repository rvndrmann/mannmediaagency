
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { SceneUpdateType } from "@/types/canvas";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { McpToolButton } from "./McpToolButton";

interface SceneGenerationPanelProps {
  fieldType: SceneUpdateType;
  isGenerating: boolean;
  isProcessing: boolean;
  activeAgent?: string | null;
  onGenerateWithAI?: () => Promise<void>;
  projectId?: string;
  sceneId?: string;
}

export function SceneGenerationPanel({
  fieldType,
  isGenerating,
  isProcessing,
  activeAgent,
  onGenerateWithAI,
  projectId,
  sceneId
}: SceneGenerationPanelProps) {
  const { useMcp, hasConnectionError, reconnectToMcp } = useMCPContext();
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  if (!onGenerateWithAI) return null;
  
  // Map field types to MCP tool names
  const getToolName = (fieldType: SceneUpdateType): string => {
    switch (fieldType) {
      case 'description': return 'update_scene_description';
      case 'imagePrompt': return 'update_image_prompt';
      case 'image': return 'generate_scene_image';
      case 'video': return 'create_scene_video';
      default: return 'generate_content';
    }
  };
  
  // Get human-readable action name
  const getActionName = (fieldType: SceneUpdateType): string => {
    switch (fieldType) {
      case 'description': return 'Scene Description';
      case 'imagePrompt': return 'Image Prompt';
      case 'script': return 'Script';
      case 'voiceOverText': return 'Voice Over Text';
      case 'image': return 'Scene Image';
      case 'video': return 'Scene Video';
      default: return 'Content';
    }
  };
  
  const handleGenerateClick = async () => {
    // If MCP is enabled but not connected, warn the user
    if (useMcp && hasConnectionError) {
      // Try to reconnect first
      setIsReconnecting(true);
      try {
        const reconnected = await reconnectToMcp();
        setIsReconnecting(false);
        
        if (!reconnected) {
          toast.error("MCP connection issue. Try reconnecting or disable MCP to use fallback generation.");
          return;
        }
      } catch (error) {
        setIsReconnecting(false);
        toast.error("Failed to reconnect to MCP services");
        return;
      }
    }
    
    try {
      await onGenerateWithAI();
    } catch (error) {
      console.error(`Error generating ${fieldType}:`, error);
      toast.error(`Failed to generate ${fieldType}. Try again or check console for details.`);
    }
  };
  
  const isThisAgentActive = activeAgent === fieldType;
  const isCurrentlyProcessing = isProcessing && isThisAgentActive;
  
  return (
    <McpToolButton
      label={`Generate with AI`}
      toolName={getToolName(fieldType)}
      icon={<Sparkles className="h-3.5 w-3.5" />}
      isProcessing={isCurrentlyProcessing || isReconnecting}
      disabled={isGenerating || isProcessing}
      onClick={handleGenerateClick}
      variant="default"
      size="sm"
      showConnectionState={useMcp}
    />
  );
}
