
import { cn } from "@/lib/utils";
import { Camera, Video, Sparkles, FileText, MessageCircle, RefreshCw } from "lucide-react";
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
    bgColor: "bg-purple-500 hover:bg-purple-600",
    creditCost: 0.2
  },
  {
    id: "product-shot-v2",
    label: "Shot V2",
    icon: <Sparkles className="h-5 w-5" />,
    bgColor: "bg-purple-500 hover:bg-purple-600",
    creditCost: 0.2
  },
  {
    id: "image-to-video",
    label: "Image to Video",
    icon: <Video className="h-5 w-5" />,
    bgColor: "bg-purple-500 hover:bg-purple-600",
    creditCost: 1
  },
  {
    id: "faceless-video",
    label: "Product Video",
    icon: <FileText className="h-5 w-5" />,
    bgColor: "bg-purple-500 hover:bg-purple-600",
    creditCost: 20
  }
];

interface MobileToolNavProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onFixButtonClick?: () => void;
  isGenerating?: boolean;
}

export function MobileToolNav({ activeTool, onToolSelect, onFixButtonClick, isGenerating = false }: MobileToolNavProps) {
  const navigate = useNavigate();

  // Get current tool credit cost
  const getActiveCreditCost = () => {
    if (activeTool === 'ai-agent') return 0.07;
    const activeTool_ = tools.find(t => t.id === activeTool);
    return activeTool_?.creditCost || 0;
  };

  // Get action text based on the active tool
  const getActionText = () => {
    if (activeTool === 'ai-agent') return 'Fix';
    if (activeTool === 'product-shot-v1' || activeTool === 'product-shot-v2') return 'Generate Image';
    if (activeTool === 'image-to-video') return 'Generate Video';
    if (activeTool === 'faceless-video') return 'Create Video';
    return 'Fix';
  };

  // Get credit cost text based on the active tool
  const getCreditCostText = () => {
    const cost = getActiveCreditCost();
    if (activeTool === 'faceless-video') {
      return `(Costs ${cost} ${cost === 1 ? "credit" : "credits"})`;
    }
    return `(${cost} ${cost === 1 ? "credit" : "credits"})`;
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 bg-[#1A1F2C]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1A1F2C]/60 border-t border-white/10 shadow-lg">
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

      {/* Fix/Generate button positioned on the right */}
      <button
        onClick={onFixButtonClick}
        disabled={isGenerating}
        className={cn(
          "absolute right-4 -top-16", // Changed from -top-8 to -top-16 to move it higher
          "flex flex-col items-center justify-center",
          "h-16 w-[auto] min-w-16 px-3 rounded-full", // Increased padding from px-2 to px-3
          "transition-all duration-300 ease-in-out",
          "shadow-lg z-50",
          isGenerating
            ? "bg-gray-500 opacity-70"
            : "bg-purple-500 hover:bg-purple-600 hover:scale-[0.98]",
          isGenerating && "animate-pulse"
        )}
        aria-label={`${getActionText()} ${getCreditCostText()}`}
      >
        <RefreshCw className={cn("h-6 w-6 text-white mb-0.5", isGenerating && "animate-spin")} />
        <span className="text-white text-[10px] font-medium whitespace-nowrap">
          {getActionText()} {getCreditCostText()}
        </span>
      </button>
    </div>
  );
}
