
import { cn } from "@/lib/utils";
import { Camera, Video, Bot, Sparkles, FileText } from "lucide-react";

interface ToolButton {
  id: string;
  label: string;
  icon: JSX.Element;
}

const tools: ToolButton[] = [
  {
    id: "product-shot-v1",
    label: "Shot V1",
    icon: <Camera className="h-4 w-4" />
  },
  {
    id: "product-shot-v2",
    label: "Shot V2",
    icon: <Sparkles className="h-4 w-4" />
  },
  {
    id: "ai-agent",
    label: "AI Agent",
    icon: <Bot className="h-4 w-4" />
  },
  {
    id: "image-to-video",
    label: "Video",
    icon: <Video className="h-4 w-4" />
  },
  {
    id: "faceless-video",
    label: "Faceless",
    icon: <FileText className="h-4 w-4" />
  }
];

interface MobileToolNavProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

export function MobileToolNav({ activeTool, onToolSelect }: MobileToolNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1A1F2C]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1A1F2C]/60 border-t border-white/10">
      <nav className="flex items-center justify-between px-2 h-16 safe-bottom">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "flex flex-col items-center justify-center w-16 py-1 px-2",
              "text-sm transition-all duration-300 ease-in-out",
              "relative overflow-hidden",
              activeTool === tool.id
                ? "text-purple-400 scale-105 transform"
                : "text-white/60 hover:text-white/80 hover:scale-105 transform"
            )}
          >
            <div className={cn(
              "transition-all duration-300",
              activeTool === tool.id ? "animate-bounce" : ""
            )}>
              {tool.icon}
            </div>
            <span className={cn(
              "mt-1 text-[10px] font-medium",
              "transition-all duration-300",
              activeTool === tool.id ? "opacity-100" : "opacity-70"
            )}>
              {tool.label}
            </span>
            {activeTool === tool.id && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
