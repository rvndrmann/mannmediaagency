
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Video, FileText, Sparkles } from "lucide-react";

const tools = [
  {
    id: 'product-shot-v1',
    name: 'Product Shot V1',
    icon: <Camera className="h-4 w-4" />,
    gradient: 'from-[#9b87f5] to-[#7E69AB]',
    activeGradient: 'from-green-500 to-green-600'
  },
  {
    id: 'product-shot-v2',
    name: 'Product Shot V2',
    icon: <Sparkles className="h-4 w-4" />,
    gradient: 'from-[#8B5CF6] to-[#6E59A5]',
    activeGradient: 'from-green-500 to-green-600'
  },
  {
    id: 'image-to-video',
    name: 'Image to Video',
    icon: <Video className="h-4 w-4" />,
    gradient: 'from-[#7E69AB] to-[#6E59A5]',
    activeGradient: 'from-green-500 to-green-600'
  },
  {
    id: 'faceless-video',
    name: 'Faceless Video',
    icon: <FileText className="h-4 w-4" />,
    gradient: 'from-[#6E59A5] to-[#1A1F2C]',
    activeGradient: 'from-green-500 to-green-600'
  }
];

interface ToolSelectorProps {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
}

export const ToolSelector = ({ activeTool, onToolSelect }: ToolSelectorProps) => {
  return (
    <div className="sticky top-0 z-10 w-full bg-[#1A1F2C]/80 backdrop-blur-lg border-b border-white/10">
      <ScrollArea className="w-full">
        <div className="p-2 md:p-4">
          <div className="grid grid-cols-2 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                className={cn(
                  "flex items-center gap-2 p-2 md:p-4 rounded-lg text-white",
                  "transition-all duration-200 transform hover:scale-[1.02]",
                  "bg-gradient-to-r",
                  activeTool === tool.id ? tool.activeGradient : tool.gradient,
                  "text-xs md:text-sm"
                )}
              >
                {tool.icon}
                <span className="font-medium truncate">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
