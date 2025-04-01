
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMCPContext } from "@/contexts/MCPContext";
import { MessageSquare, Image, Video, Zap, ZapOff } from "lucide-react";
import { MCPConnectionStatus } from "./MCPConnectionStatus";
import { Separator } from "@/components/ui/separator";
import { McpToolButton } from "./McpToolButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SceneControlsProps {
  sceneId: string;
  imagePrompt?: string;
  hasImage: boolean;
  isProcessing: boolean;
  activeAgent: string | null;
  onGenerateImage: () => Promise<void>;
  onGenerateVideo: () => Promise<void>;
}

export function SceneControls({ 
  sceneId, 
  imagePrompt = "", // Add a default empty string here
  hasImage, 
  isProcessing, 
  activeAgent,
  onGenerateImage, 
  onGenerateVideo 
}: SceneControlsProps) {
  const { useMcp, setUseMcp, mcpServers } = useMCPContext();
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    setIsConnected(useMcp && mcpServers.length > 0 && mcpServers.some(server => server.isConnected()));
  }, [useMcp, mcpServers]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={useMcp} 
                  onCheckedChange={setUseMcp} 
                  id="mcp-toggle"
                />
                <Label htmlFor="mcp-toggle" className="text-sm cursor-pointer">
                  {useMcp ? (
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span>MCP Enabled</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ZapOff className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">MCP Disabled</span>
                    </span>
                  )}
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {useMcp 
                ? "Using Model Context Protocol for enhanced AI features" 
                : "Enable Model Context Protocol for enhanced AI features"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <MCPConnectionStatus showConnectionDetails />
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-2 gap-4">
        <McpToolButton
          label="Generate Scene Image"
          toolName="generate_scene_image"
          icon={<Image className="h-4 w-4" />}
          isProcessing={isProcessing && activeAgent === 'image'}
          disabled={!imagePrompt || !imagePrompt.trim()} // Add null check here
          onClick={onGenerateImage}
          variant="outline"
        />
        
        <McpToolButton
          label="Generate Scene Video"
          toolName="create_scene_video"
          icon={<Video className="h-4 w-4" />}
          isProcessing={isProcessing && activeAgent === 'video'}
          disabled={!hasImage}
          onClick={onGenerateVideo}
          variant="outline"
        />
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
