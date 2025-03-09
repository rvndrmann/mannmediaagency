
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Clapperboard, 
  FileText,
  PlusSquare,
  VideoIcon,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolSelectorProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onCustomOrderClick?: () => void;
  onVideoTemplatesClick?: () => void;
  showVideoTemplatesButton?: boolean;
  isMobile: boolean;
  onBackClick?: () => void;
}

export const ToolSelector = ({ 
  activeTool, 
  onToolSelect,
  onCustomOrderClick,
  onVideoTemplatesClick,
  showVideoTemplatesButton = false,
  isMobile,
  onBackClick
}: ToolSelectorProps) => {
  const tools = [
    {
      id: "ai-agent",
      name: "AI Chat",
      icon: MessageSquare,
      tooltip: "Chat with AI assistant",
      mobileOnly: true
    },
    {
      id: "product-shot-v1",
      name: "Product Shot",
      icon: Camera,
      tooltip: "Generate product images"
    },
    {
      id: "product-shot-v2",
      name: "Advanced Shot",
      icon: FileText,
      tooltip: "Advanced product image options"
    },
    {
      id: "image-to-video",
      name: "Video",
      icon: Clapperboard,
      tooltip: "Create videos from images"
    }
  ];

  const filteredTools = isMobile 
    ? tools 
    : tools.filter(tool => !tool.mobileOnly);

  return (
    <div className="border-b border-white/10 bg-[#1E2432] p-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {onBackClick && isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackClick}
            className="text-xs text-white/60 hover:text-white hover:bg-white/10 mr-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        
        <TooltipProvider>
          {filteredTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToolSelect(tool.id)}
                  className={cn(
                    "text-xs text-white/60 hover:text-white hover:bg-white/10",
                    activeTool === tool.id && "bg-white/10 text-white"
                  )}
                >
                  <tool.icon className="h-4 w-4 mr-2" />
                  {tool.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      
      <div className="flex items-center space-x-2">
        {showVideoTemplatesButton && onVideoTemplatesClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onVideoTemplatesClick}
                  className="text-xs text-white/60 hover:text-white hover:bg-white/10"
                >
                  <VideoIcon className="h-4 w-4 mr-2" />
                  Video Templates
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create videos from your product shots</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCustomOrderClick}
                className="text-xs text-white/60 hover:text-white hover:bg-white/10"
              >
                <PlusSquare className="h-4 w-4 mr-2" />
                Custom Order
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Request a custom design with multiple images</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
