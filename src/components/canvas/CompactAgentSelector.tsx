
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { AgentBadge } from "../multi-agent/AgentBadge";

export interface CompactAgentSelectorProps {
  selectedAgent: AgentType;
  onSelect?: (agentId: AgentType) => void;
}

export function CompactAgentSelector({ selectedAgent, onSelect }: CompactAgentSelectorProps) {
  const agentTypes: AgentType[] = ["main", "script", "image", "scene", "tool", "data"];
  
  const handleSelect = (agentType: AgentType) => {
    if (onSelect) {
      onSelect(agentType);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {agentTypes.map((agentType) => (
        <button
          key={agentType}
          className={`p-1 rounded-md transition-colors ${
            selectedAgent === agentType ? "bg-primary/10" : "bg-secondary/20 hover:bg-secondary/30"
          }`}
          onClick={() => handleSelect(agentType)}
        >
          <AgentBadge agentType={agentType} size="sm" />
        </button>
      ))}
    </div>
  );
}
