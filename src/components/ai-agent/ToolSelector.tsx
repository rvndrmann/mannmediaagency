
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Video, FileText, MessageSquare, Sparkles } from "lucide-react";

type Tool = {
  id: string;
  name: string;
  icon: JSX.Element;
};

const tools: Tool[] = [
  { id: 'product-shot-v1', name: 'Product Shot V1', icon: <Camera className="h-4 w-4" /> },
  { id: 'product-shot-v2', name: 'Product Shot V2', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'image-to-video', name: 'Image to Video', icon: <Video className="h-4 w-4" /> },
  { id: 'faceless-video', name: 'Faceless Video', icon: <Video className="h-4 w-4" /> },
  { id: 'script-builder', name: 'Script Builder', icon: <FileText className="h-4 w-4" /> },
];

interface ToolSelectorProps {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
}

export const ToolSelector = ({ activeTool, onToolSelect }: ToolSelectorProps) => {
  return (
    <div className="w-full bg-[#1A1F2C]/80 backdrop-blur-lg border-b border-white/10">
      <ScrollArea className="w-full">
        <div className="flex p-2 gap-2">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant="ghost"
              size="sm"
              onClick={() => onToolSelect(tool.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap text-sm text-white/80 hover:text-white hover:bg-white/10",
                activeTool === tool.id && "bg-white/10 text-white"
              )}
            >
              {tool.icon}
              {tool.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
