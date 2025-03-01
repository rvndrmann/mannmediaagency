
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
      route: "/profile"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1F2C] border-t border-white/10 shadow-lg">
      {/* Main navigation at the very bottom */}
      <nav className="grid grid-cols-4 py-3 px-3 border-t border-white/10">
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
      
      {/* AI Tools grid positioned above main nav */}
      <nav className="grid grid-cols-2 gap-3 p-3 pb-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "flex flex-col items-center justify-center py-3 px-4 rounded-xl",
              "transition-all duration-300 ease-in-out",
              activeTool === tool.id 
                ? "bg-green-500 transform scale-[0.98]"
                : tool.bgColor + " hover:scale-[0.98]"
            )}
          >
            <div className="text-white mb-1.5">
              {tool.icon}
            </div>
            <span className="text-white font-medium text-[11px]">
              {tool.label}
            </span>
          </button>
        ))}
      </nav>
      
      {/* AI Agent button positioned above the tool grid */}
      <button
        onClick={() => onToolSelect('ai-agent')}
        className={cn(
          "absolute left-1/2 -top-10 -translate-x-1/2 transform",
          "flex flex-col items-center justify-center",
          "h-16 w-16 rounded-full",
          "transition-all duration-300 ease-in-out",
          "shadow-lg",
          activeTool === 'ai-agent'
            ? "bg-green-500 scale-[0.98]"
            : "bg-green-500 hover:bg-green-600 hover:scale-[0.98]"
        )}
      >
        <MessageCircle className="h-6 w-6 text-white mb-0.5" />
        <span className="text-white text-[10px] font-medium">AI AGENT</span>
      </button>
    </div>
  );
}
