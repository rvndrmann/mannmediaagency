
import { cn } from "@/lib/utils";
import { Camera, Video, Bot, Sparkles, FileText, MessageCircle } from "lucide-react";

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
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1A1F2C]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1A1F2C]/60 border-t border-white/10 shadow-lg">
      {/* Main grid with 2x2 layout for the tools and center button for AI Agent */}
      <nav className="relative grid grid-cols-2 gap-3 p-3">
        {/* First row: Shot V1 and Shot V2 */}
        <button
          key={tools[0].id}
          onClick={() => onToolSelect(tools[0].id)}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-3 rounded-lg",
            "transition-all duration-300 ease-in-out",
            activeTool === tools[0].id 
              ? "bg-green-500 transform scale-[0.98]"
              : tools[0].bgColor + " hover:scale-[0.98]"
          )}
        >
          <div className="text-white mb-1">
            {tools[0].icon}
          </div>
          <span className="text-white font-medium text-[11px]">
            {tools[0].label}
          </span>
        </button>
        
        <button
          key={tools[1].id}
          onClick={() => onToolSelect(tools[1].id)}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-3 rounded-lg",
            "transition-all duration-300 ease-in-out",
            activeTool === tools[1].id 
              ? "bg-green-500 transform scale-[0.98]"
              : tools[1].bgColor + " hover:scale-[0.98]"
          )}
        >
          <div className="text-white mb-1">
            {tools[1].icon}
          </div>
          <span className="text-white font-medium text-[11px]">
            {tools[1].label}
          </span>
        </button>
        
        {/* Second row: Image to Video and Product Video */}
        <button
          key={tools[2].id}
          onClick={() => onToolSelect(tools[2].id)}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-3 rounded-lg",
            "transition-all duration-300 ease-in-out",
            activeTool === tools[2].id 
              ? "bg-green-500 transform scale-[0.98]"
              : tools[2].bgColor + " hover:scale-[0.98]"
          )}
        >
          <div className="text-white mb-1">
            {tools[2].icon}
          </div>
          <span className="text-white font-medium text-[11px]">
            {tools[2].label}
          </span>
        </button>
        
        <button
          key={tools[3].id}
          onClick={() => onToolSelect(tools[3].id)}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-3 rounded-lg",
            "transition-all duration-300 ease-in-out",
            activeTool === tools[3].id 
              ? "bg-green-500 transform scale-[0.98]"
              : tools[3].bgColor + " hover:scale-[0.98]"
          )}
        >
          <div className="text-white mb-1">
            {tools[3].icon}
          </div>
          <span className="text-white font-medium text-[11px]">
            {tools[3].label}
          </span>
        </button>
        
        {/* Third row: AI Agent in the center */}
        <div className="col-span-2 flex justify-center mt-3">
          <button
            onClick={() => onToolSelect('ai-agent')}
            className={cn(
              "flex flex-col items-center justify-center",
              "py-2.5 px-6 rounded-lg",
              "transition-all duration-300 ease-in-out",
              activeTool === 'ai-agent'
                ? "bg-green-500 transform scale-[0.98]"
                : "bg-purple-500 hover:bg-purple-600 hover:scale-[0.98]"
            )}
          >
            <div className="text-white mb-1">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-white font-medium text-[11px]">
              AI AGENT
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
