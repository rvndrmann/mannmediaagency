
import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SceneUpdateType } from "@/types/canvas";
import { useMCPContext } from "@/contexts/MCPContext";
import { toast } from "sonner";

interface SceneGenerationPanelProps {
  fieldType: SceneUpdateType;
  isGenerating: boolean;
  isProcessing: boolean;
  activeAgent?: string | null;
  onGenerateWithAI?: () => Promise<void>;
}

export function SceneGenerationPanel({
  fieldType,
  isGenerating,
  isProcessing,
  activeAgent,
  onGenerateWithAI
}: SceneGenerationPanelProps) {
  const { mcpServers, useMcp, hasConnectionError } = useMCPContext();
  
  if (!onGenerateWithAI) return null;
  
  const handleGenerateClick = async () => {
    // If MCP is enabled but not connected, warn the user
    if (useMcp && (mcpServers.length === 0 || hasConnectionError)) {
      toast.error("MCP connection issue. Try reconnecting or disable MCP to use fallback generation.");
      return;
    }
    
    try {
      await onGenerateWithAI();
    } catch (error) {
      console.error(`Error generating ${fieldType}:`, error);
      toast.error(`Failed to generate ${fieldType}. Try again or check console for details.`);
    }
  };
  
  return (
    <Button 
      variant="default" 
      size="sm" 
      onClick={handleGenerateClick}
      disabled={isGenerating || isProcessing}
    >
      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
      {isProcessing && activeAgent === fieldType ? "Generating..." : "Generate with AI"}
    </Button>
  );
}
