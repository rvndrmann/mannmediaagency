
import { cn } from "@/lib/utils";
import { Camera, Video, Sparkles, FileText, MessageCircle, Compass, ScrollText, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ToolButton {
  id: string;
  label: string;
  icon: JSX.Element;
  bgColor: string;
  creditCost: number;
}

const tools: ToolButton[] = [
  {
    id: "product-shot-v1",
    label: "Shot V1",
    icon: <Camera className="h-5 w-5" />,
    bgColor: "bg-purple-500/80 hover:bg-purple-600/80",
    creditCost: 0.2
  },
  {
    id: "product-shot-v2",
    label: "Shot V2",
    icon: <Sparkles className="h-5 w-5" />,
    bgColor: "bg-purple-500/80 hover:bg-purple-600/80",
    creditCost: 0.2
  },
  {
    id: "image-to-video",
    label: "Image to Video",
    icon: <Video className="h-5 w-5" />,
    bgColor: "bg-purple-500/80 hover:bg-purple-600/80",
    creditCost: 1
  },
  {
    id: "faceless-video",
    label: "Product Video",
    icon: <FileText className="h-5 w-5" />,
    bgColor: "bg-purple-500/80 hover:bg-purple-600/80",
    creditCost: 20
  }
];

interface MobileToolNavProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

export function MobileToolNav({ activeTool, onToolSelect }: MobileToolNavProps) {
  const navigate = useNavigate();

  // Main navigation items
  const mainNavItems = [
    {
      id: "ai-agent",
      label: "AI Agent",
      icon: <MessageCircle className="h-5 w-5" />,
      route: "/ai-agent"
    },
    {
      id: "explore",
      label: "Explore",
      icon: <Compass className="h-5 w-5" />,
      route: "/explore"
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <ScrollText className="h-5 w-5" />,
      route: "/dashboard"
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      route: "/settings"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Main navigation at the very bottom */}
      <nav className="grid grid-cols-4 py-3 px-3 bg-[#1A1F2C] border-t border-white/10 shadow-lg">
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.route)}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2",
              "transition-all duration-300 ease-in-out",
              item.id === activeTool.split('-')[0] 
                ? "text-purple-400" 
                : "text-gray-400 hover:text-gray-300"
            )}
          >
            <div className="mb-1">
              {item.icon}
            </div>
            <span className="text-[10px] font-medium">
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
