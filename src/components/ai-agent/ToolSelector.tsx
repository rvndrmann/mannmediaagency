
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Camera, 
  Clapperboard, 
  FileText,
  PlusSquare 
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
}

export const ToolSelector = ({ 
  activeTool, 
  onToolSelect,
  onCustomOrderClick
}: ToolSelectorProps) => {
  const tools = [
    {
      id: "ai-agent",
      name: "AI Chat",
      icon: MessageSquare,
      tooltip: "Chat with AI assistant"
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

  return (
    <div className="border-b border-white/10 bg-[#1E2432] p-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <TooltipProvider>
          {tools.map((tool) => (
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
  );
};
