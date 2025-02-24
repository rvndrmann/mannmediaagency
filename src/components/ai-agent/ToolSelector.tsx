
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Video, FileText, Sparkles } from "lucide-react";

const tools = [
  {
    id: 'product-shot-v1',
    name: 'Product Shot V1',
    icon: <Camera className="h-5 w-5" />,
    gradient: 'from-[#9b87f5] to-[#7E69AB]'
  },
  {
    id: 'product-shot-v2',
    name: 'Product Shot V2',
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-[#8B5CF6] to-[#6E59A5]'
  },
  {
    id: 'image-to-video',
    name: 'Image to Video',
    icon: <Video className="h-5 w-5" />,
    gradient: 'from-[#7E69AB] to-[#6E59A5]'
  },
  {
    id: 'faceless-video',
    name: 'Faceless Video',
    icon: <FileText className="h-5 w-5" />,
    gradient: 'from-[#6E59A5] to-[#1A1F2C]'
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
        <div className="p-4 space-y-3">
          <h2 className="text-white text-lg font-semibold mb-3">Available Tools</h2>
          <div className="grid grid-cols-2 gap-3">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg text-white",
                  "transition-all duration-200 transform hover:scale-105",
                  "bg-gradient-to-r",
                  tool.gradient,
                  activeTool === tool.id ? "ring-2 ring-white/50" : ""
                )}
              >
                {tool.icon}
                <span className="mt-2 text-sm font-medium">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
