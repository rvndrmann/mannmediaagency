
import {
  MessageSquare,
  Camera,
  Clapperboard,
  FileText,
  PlusSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MobileToolNavProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onCustomOrderClick?: () => void;
}

export const MobileToolNav = ({ 
  activeTool, 
  onToolSelect,
  onCustomOrderClick
}: MobileToolNavProps) => {
  const navigate = useNavigate();
  
  const tools = [
    {
      id: "ai-agent",
      name: "AI Chat",
      icon: MessageSquare,
    },
    {
      id: "product-shot-v1",
      name: "Product Shot",
      icon: Camera,
    },
    {
      id: "product-shot-v2",
      name: "Shot V2",
      icon: FileText,
    },
    {
      id: "image-to-video",
      name: "Video",
      icon: Clapperboard,
    },
  ];

  const handleCustomOrderClick = () => {
    if (onCustomOrderClick) {
      onCustomOrderClick();
    } else {
      navigate("/custom-orders");
    }
  };

  return (
    <div className="flex items-center justify-between bg-[#1E2432] border-t border-white/10 p-3">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolSelect(tool.id)}
          className={cn(
            "flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-colors",
            activeTool === tool.id
              ? "text-white bg-white/10"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <tool.icon className="w-5 h-5 mb-1" />
          <span className="text-xs">{tool.name}</span>
        </button>
      ))}
      <button
        onClick={handleCustomOrderClick}
        className="flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-colors text-white/60 hover:text-white hover:bg-white/5"
      >
        <PlusSquare className="w-5 h-5 mb-1" />
        <span className="text-xs">Custom</span>
      </button>
    </div>
  );
};
