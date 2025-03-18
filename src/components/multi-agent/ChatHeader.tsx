
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trash2 } from "lucide-react";
import { type AgentType } from "@/hooks/use-multi-agent-chat";

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

  return (
    <div className="bg-[#1A1F29] border-b border-white/10 sticky top-0 z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/5 transition-colors mr-2 p-0 h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-medium text-white">
            {getAgentTitle(activeAgent)}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          className="text-white/70 hover:bg-white/5 transition-colors p-0 h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
