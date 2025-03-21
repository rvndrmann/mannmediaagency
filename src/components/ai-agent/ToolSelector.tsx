
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Clapperboard, 
  FileText,
  ShoppingBag,
  VideoIcon,
  ArrowLeft,
  MessageSquare,
  Globe,
  Video
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
      name: "Image to Video",
      icon: Clapperboard,
      tooltip: "Create videos from images"
    },
    {
      id: "browser-use",
      name: "Browser Use",
      icon: Globe,
      tooltip: "Automate browser tasks"
    },
    {
      id: "product-video",
      name: "Product Video",
      icon: Video,
      tooltip: "Create professional product videos"
    }
  ];

  return (
    <div className="flex items-center justify-center py-2 bg-[#1E2432] border-b border-white/10">
      <div className="flex bg-[#262B38] rounded-lg p-1 gap-1">
        {onBackClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackClick}
            className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-md text-white/70 hover:bg-[#333945] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Button>
        )}
        
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant="ghost"
            size="sm"
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-sm rounded-md",
              activeTool === tool.id 
                ? "bg-[#9b87f5] text-white hover:bg-[#9b87f5]/90"
                : "text-white/70 hover:bg-[#333945] hover:text-white"
            )}
          >
            <tool.icon className="h-5 w-5" />
            <span>{tool.name}</span>
          </Button>
        ))}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCustomOrderClick}
          className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-md text-white/70 hover:bg-[#333945] hover:text-white"
        >
          <ShoppingBag className="h-5 w-5" />
          <span>Custom Order</span>
        </Button>
      </div>
    </div>
  );
};
