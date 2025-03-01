
import { cn } from "@/lib/utils";
import { tools } from "./MobileToolNav";

interface MobileToolsGridProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

export function MobileToolsGrid({ activeTool, onToolSelect }: MobileToolsGridProps) {
  return (
    <div className="px-3 pt-3 pb-4">
      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              "flex flex-col items-center justify-center py-4 px-4 rounded-xl",
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
      </div>
    </div>
  );
}
