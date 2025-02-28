
import { cn } from "@/lib/utils";
import { Camera, Video, Sparkles, FileText, MessageCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    icon: <Camera className="h-5 w-5" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "product-shot-v2",
    label: "Shot V2",
    icon: <Sparkles className="h-5 w-5" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "image-to-video",
    label: "Image to Video",
    icon: <Video className="h-5 w-5" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "faceless-video",
    label: "Product Video",
    icon: <FileText className="h-5 w-5" />,
    bgColor: "bg-purple-500 hover:bg-purple-600"
  }
];

interface MobileToolNavProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

export function MobileToolNav({ activeTool, onToolSelect }: MobileToolNavProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1A1F2C]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1A1F2C]/60 border-t border-white/10 shadow-lg">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute -top-12 left-4 bg-[#1A1F2C]/80 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>
      
      {/* Main grid with 2x2 layout */}
      <nav className="relative grid grid-cols-2 gap-3 p-3 pb-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "flex flex-col items-center justify-center py-2.5 px-3 rounded-lg",
              "transition-all duration-300 ease-in-out",
              activeTool === tool.id 
                ? "bg-green-500 transform scale-[0.98]"
                : tool.bgColor + " hover:scale-[0.98]"
            )}
          >
            <div className="text-white mb-1">
              {tool.icon}
            </div>
            <span className="text-white font-medium text-[11px]">
              {tool.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Chat button positioned above the navigation */}
      <button
        onClick={() => onToolSelect('ai-agent')}
        className={cn(
          "absolute left-1/2 -top-8 -translate-x-1/2",
          "flex flex-col items-center justify-center",
          "h-16 w-16 rounded-full",
          "transition-all duration-300 ease-in-out",
          "shadow-lg z-50",
          activeTool === 'ai-agent'
            ? "bg-green-500 transform scale-[0.98]"
            : "bg-purple-500 hover:bg-purple-600 hover:scale-[0.98]"
        )}
      >
        <MessageCircle className="h-6 w-6 text-white mb-0.5" />
        <span className="text-white text-[10px] font-medium">AI AGENT</span>
      </button>
    </div>
  );
}
