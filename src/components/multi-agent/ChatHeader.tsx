
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trash2, Info } from "lucide-react";
import { type AgentType } from "@/hooks/use-multi-agent-chat";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface ChatHeaderProps {
  onBack: () => void;
  onClearChat: () => void;
  activeAgent: AgentType;
}

export const ChatHeader = ({ onBack, onClearChat, activeAgent }: ChatHeaderProps) => {
  const getAgentTitle = (agent: AgentType): string => {
    switch (agent) {
      case "script": return "Script Writer Agent";
      case "image": return "Image Prompt Agent";
      case "tool": return "Tool Orchestrator Agent";
      default: return "Multi-Agent Chat";
    }
  };

  const getAgentDescription = (agent: AgentType): string => {
    switch (agent) {
      case "script": return "Specialized in creating scripts, dialogue, and narrative content";
      case "image": return "Creates detailed prompts for AI image generation systems";
      case "tool": return "Helps you use tools like image-to-video conversion";
      default: return "General-purpose AI assistant";
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#1A1F29]/95 to-[#262B38]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-10 shadow-md">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/10 transition-colors mr-2 p-0 h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-medium text-white flex items-center">
            {getAgentTitle(activeAgent)}
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-1 p-0 h-6 w-6 text-white/60 hover:text-white/80">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#333] text-white border-[#555] max-w-xs">
                  <p className="text-sm">{getAgentDescription(activeAgent)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          className="text-white/70 hover:text-white hover:bg-white/10 transition-colors p-0 h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
