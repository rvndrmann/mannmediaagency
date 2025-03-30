
import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle } from "lucide-react";
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
  
  if (!onGenerateWithAI) return null;
  
  const handleGenerateClick = async () => {
    // If MCP is enabled but not connected, warn the user
    if (useMcp && (mcpServers.length === 0 || hasConnectionError)) {
      // Try to reconnect first
      const reconnected = await reconnectToMcp();
      
      if (!reconnected) {
        toast.error("MCP connection issue. Try reconnecting or disable MCP to use fallback generation.");
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
  
  const isDisabled = isGenerating || isProcessing;
  const hasMCPIssue = useMcp && (mcpServers.length === 0 || hasConnectionError);
  
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
            {hasMCPIssue ? (
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-yellow-500" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isProcessing && activeAgent === fieldType ? 
              "Generating..." : 
              hasMCPIssue ? "MCP Disconnected" : "Generate with AI"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hasMCPIssue ? 
            "MCP is disconnected. Click to attempt reconnection before generating." : 
            `Generate ${fieldType} using AI`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
