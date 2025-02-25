
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
      <nav className="flex items-center justify-between px-2 h-16">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "flex flex-col items-center justify-center w-16 py-1 px-2",
              "text-sm transition-colors",
              activeTool === tool.id
                ? "text-purple-400"
                : "text-white/60 hover:text-white/80"
            )}
          >
            {tool.icon}
            <span className="mt-1 text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
