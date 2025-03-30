
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentType } from "@/hooks/use-multi-agent-chat";

interface AgentSelectorProps {
  selectedAgent: AgentType;
  onSelectAgent: (agentType: AgentType) => void;
  disabled?: boolean;
}

export function AgentSelector({ selectedAgent, onSelectAgent, disabled }: AgentSelectorProps) {
  const agents = [
    { id: "main", name: "Main Assistant" },
    { id: "script", name: "Script Writer" },
    { id: "image", name: "Image Generator" },
    { id: "scene", name: "Scene Creator" }
  ];
  
  return (
    <Select
      value={selectedAgent}
      onValueChange={onSelectAgent}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Agent" />
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
