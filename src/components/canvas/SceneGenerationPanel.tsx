
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { SceneUpdateType } from "@/types/canvas";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { mcpServers, useMcp, hasConnectionError, reconnectToMcp } = useMCPContext();
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  if (!onGenerateWithAI) return null;
  
  const handleGenerateClick = async () => {
    // If MCP is enabled but not connected, warn the user
    if (useMcp && (mcpServers.length === 0 || hasConnectionError)) {
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
  
  const isDisabled = isGenerating || isProcessing || isReconnecting;
  const hasMCPIssue = useMcp && (mcpServers.length === 0 || hasConnectionError);
  
  const getButtonText = () => {
    if (isProcessing && activeAgent === fieldType) return "Generating...";
    if (isReconnecting) return "Reconnecting...";
    if (hasMCPIssue) return "MCP Disconnected";
    return "Generate with AI";
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={hasMCPIssue ? "outline" : "default"} 
            size="sm" 
            onClick={handleGenerateClick}
            disabled={isDisabled}
            className={hasMCPIssue ? "border-yellow-300" : ""}
          >
            {isReconnecting ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : hasMCPIssue ? (
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-yellow-500" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {getButtonText()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isReconnecting ? 
            "Reconnecting to MCP services..." :
            hasMCPIssue ? 
              "MCP is disconnected. Click to attempt reconnection before generating." : 
              `Generate ${fieldType} using AI`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
