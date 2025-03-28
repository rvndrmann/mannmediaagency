
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";

interface AgentInstructionsTableProps {
  activeAgent: AgentType;
  agentInstructions: Record<string, string>;
  onEditInstructions: (agentType: AgentType) => void;
}

export function AgentInstructionsTable({ 
  activeAgent, 
  agentInstructions,
  onEditInstructions
}: AgentInstructionsTableProps) {
  const getAgentName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      default: return "Assistant";
    }
  };
  
  return (
    <div className="mb-2 bg-[#21283B]/60 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg p-2">
      <div className="space-y-1">
        <div className="bg-[#1A1F29]/80 backdrop-blur-sm rounded-lg p-2">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium text-white">{getAgentName(activeAgent)} Instructions</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
              onClick={() => onEditInstructions(activeAgent)}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
          <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-28 overflow-y-auto">
            {agentInstructions[activeAgent] || "No instructions set."}
          </div>
        </div>
      </div>
    </div>
  );
}
