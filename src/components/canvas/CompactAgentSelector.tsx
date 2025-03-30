
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { 
  Sparkles, 
  FileText, 
  Image, 
  Box,
  LayoutTemplate,
  Database
} from "lucide-react";

interface CompactAgentSelectorProps {
  selectedAgent: AgentType;
  onSelectAgent: (agent: AgentType) => void;
  disabled?: boolean;
}

export function CompactAgentSelector({ 
  selectedAgent, 
  onSelectAgent, 
  disabled = false 
}: CompactAgentSelectorProps) {
  const [open, setOpen] = useState(false);

  const agents = [
    { id: "main" as AgentType, name: "Assistant", icon: <Sparkles className="h-4 w-4" /> },
    { id: "script" as AgentType, name: "Script Writer", icon: <FileText className="h-4 w-4" /> },
    { id: "image" as AgentType, name: "Image Prompt", icon: <Image className="h-4 w-4" /> },
    { id: "tool" as AgentType, name: "Tool", icon: <Box className="h-4 w-4" /> },
    { id: "scene" as AgentType, name: "Scene", icon: <LayoutTemplate className="h-4 w-4" /> },
    { id: "data" as AgentType, name: "Data Agent", icon: <Database className="h-4 w-4" /> }
  ];

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent) || agents[0];

  const handleSelectAgent = (agent: AgentType) => {
    onSelectAgent(agent);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start text-xs gap-1 px-1.5 py-1 h-7 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        {selectedAgentData.icon}
        <span className="truncate">{selectedAgentData.name}</span>
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-40 bg-background border rounded-md shadow-md p-1">
          {agents.map((agent) => (
            <Button
              key={agent.id}
              variant={agent.id === selectedAgent ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start text-xs py-1.5 my-0.5 px-2"
              onClick={() => handleSelectAgent(agent.id)}
            >
              {agent.icon}
              <span className="ml-1.5">{agent.name}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
