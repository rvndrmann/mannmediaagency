
import {
  MessageSquare,
  Camera,
  Clapperboard,
  FileText,
  ShoppingBag
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
      name: "Advanced",
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
    <div className="flex items-center justify-between bg-[#1E2432] border-t border-white/10 p-2 fixed bottom-0 left-0 right-0 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolSelect(tool.id)}
          className={cn(
            "flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-colors",
            activeTool === tool.id
              ? "text-[#9b87f5]"
              : "text-white/60 hover:text-white"
          )}
        >
          <tool.icon className="w-5 h-5 mb-1" />
          <span className="text-xs">{tool.name}</span>
        </button>
      ))}
      <button
        onClick={handleCustomOrderClick}
        className="flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-colors text-white/60 hover:text-white"
      >
        <ShoppingBag className="w-5 h-5 mb-1" />
        <span className="text-xs">Custom</span>
      </button>
    </div>
  );
};
