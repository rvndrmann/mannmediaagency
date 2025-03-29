
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { ArrowRight } from "lucide-react";
import { getAgentIcon, getAgentName } from "@/lib/agent-icons";

interface HandoffIndicatorProps {
  fromAgent: AgentType;
  toAgent: AgentType;
  onCancel?: () => void;
  visible?: boolean;
}

export function HandoffIndicator({ fromAgent, toAgent, onCancel, visible = true }: HandoffIndicatorProps) {
  if (!visible) return null;
  
  const renderAgentIcon = (agentType: AgentType) => {
    const IconComponent = getAgentIcon(agentType);
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none">
      <div className="bg-[#21283B]/90 backdrop-blur-sm rounded-lg border border-white/10 text-white shadow-lg px-4 py-2 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1">
          {renderAgentIcon(fromAgent)}
          <span className="text-sm font-medium">{getAgentName(fromAgent)}</span>
        </div>
        
        <ArrowRight className="text-gray-400 w-4 h-4" />
        
        <div className="flex items-center gap-1">
          {renderAgentIcon(toAgent)}
          <span className="text-sm font-medium">{getAgentName(toAgent)}</span>
        </div>
        
        <span className="text-xs text-gray-400 ml-2">Handoff in progress...</span>
        
        {onCancel && (
          <button 
            onClick={onCancel}
            className="ml-2 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
