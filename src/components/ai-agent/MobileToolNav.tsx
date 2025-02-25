
import { cn } from "@/lib/utils";
import { Camera, Video, Bot, Sparkles, FileText } from "lucide-react";

interface ToolButton {
  id: string;
  label: string;
  icon: JSX.Element;
  bgColor: string;
}

const tools: ToolButton[] = [
  {
    id: "product-shot-v1",
    label: "Shot V1",
    icon: <Camera className="h-6 w-6" />,
    bgColor: "bg-green-500 hover:bg-green-600"
  },
  {
    id: "product-shot-v2",
    label: "Shot V2",
    icon: <Sparkles className="h-6 w-6" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "image-to-video",
    label: "Video",
    icon: <Video className="h-6 w-6" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "faceless-video",
    label: "Faceless",
    icon: <FileText className="h-6 w-6" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "ai-agent",
    label: "AI Agent",
    icon: <Bot className="h-6 w-6" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  }
];

interface MobileToolNavProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

export function MobileToolNav({ activeTool, onToolSelect }: MobileToolNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1F2C]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1A1F2C]/60 border-t border-white/10 shadow-lg p-3">
      <nav className="grid grid-cols-2 gap-3">
        {tools.map((tool, index) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "flex flex-col items-center justify-center py-3 px-4 rounded-lg",
              "transition-all duration-300 ease-in-out",
              tool.bgColor,
              activeTool === tool.id 
                ? "ring-2 ring-white ring-opacity-50 transform scale-[0.98]"
                : "hover:scale-[0.98]",
              // Make the last item span full width if it's alone in its row
              index === tools.length - 1 && tools.length % 2 === 1 ? "col-span-2" : ""
            )}
          >
            <div className="text-white mb-2">
              {tool.icon}
            </div>
            <span className="text-white font-medium text-sm">
              {tool.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
