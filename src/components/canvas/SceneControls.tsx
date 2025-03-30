
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMCPContext } from "@/contexts/MCPContext";
import { MessageSquare, Image, Video } from "lucide-react";
import { MCPConnectionStatus } from "./MCPConnectionStatus";

interface SceneControlsProps {
  sceneId: string;
  imagePrompt: string;
  hasImage: boolean;
  isProcessing: boolean;
  activeAgent: string | null;
  onGenerateImage: () => Promise<void>;
  onGenerateVideo: () => Promise<void>;
}

export function SceneControls({ 
  sceneId, 
  imagePrompt, 
  hasImage, 
  isProcessing, 
  activeAgent,
  onGenerateImage, 
  onGenerateVideo 
}: SceneControlsProps) {
  const { useMcp, setUseMcp } = useMCPContext();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Use MCP</span>
          <Switch 
            checked={useMcp} 
            onCheckedChange={setUseMcp} 
          />
          {useMcp && (
            <span className="text-xs text-green-400 ml-1">(Recommended)</span>
          )}
        </div>
        
        <MCPConnectionStatus />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          disabled={!imagePrompt.trim() || isProcessing}
          onClick={onGenerateImage}
        >
          <Image className="h-4 w-4 mr-2" />
          {isProcessing && activeAgent === 'image' ? "Generating Image..." : "Generate Scene Image"}
        </Button>
        
        <Button
          variant="outline"
          disabled={!hasImage || isProcessing}
          onClick={onGenerateVideo}
        >
          <Video className="h-4 w-4 mr-2" />
          {isProcessing && activeAgent === 'video' ? "Generating Video..." : "Generate Scene Video"}
        </Button>
      </div>
      
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const chatUrl = `/multi-agent-chat?projectId=${sceneId.split('/')[0]}&sceneId=${sceneId}`;
            window.open(chatUrl, '_blank');
          }}
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          Open Full Multi-Agent Chat
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Use the multi-agent chat for more advanced scene creation, image prompts, and detailed directions.
        </p>
      </div>
    </div>
  );
}
