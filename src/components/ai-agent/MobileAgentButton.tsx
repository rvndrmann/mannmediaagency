
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface MobileAgentButtonProps {
  onToolSelect: (tool: string) => void;
}

export function MobileAgentButton({ onToolSelect }: MobileAgentButtonProps) {
  return (
    <div className="flex justify-center mb-4">
      <Button 
        onClick={() => onToolSelect('ai-agent')}
        className={cn(
          "flex flex-col items-center justify-center",
          "h-16 w-16 rounded-full z-40",
          "transition-all duration-300 ease-in-out",
          "shadow-lg bg-green-500 hover:bg-green-600"
        )}
      >
        <MessageCircle className="h-6 w-6 text-white mb-0.5" />
        <span className="text-white text-[10px] font-medium">AI AGENT</span>
      </Button>
    </div>
  );
}
