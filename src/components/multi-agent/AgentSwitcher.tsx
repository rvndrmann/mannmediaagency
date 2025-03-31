
import React from "react";
import { Button } from "@/components/ui/button";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { 
  Bot, 
  FileText, 
  Image, 
  Hammer, 
  Camera, 
  BarChart 
} from "lucide-react";

interface AgentSwitcherProps {
  currentAgent: AgentType;
  onSwitchAgent: (agentType: AgentType) => void;
  showLabels?: boolean;
  compact?: boolean;
}

export function AgentSwitcher({
  currentAgent,
  onSwitchAgent,
  showLabels = true,
  compact = false,
}: AgentSwitcherProps) {
  const agents: { type: AgentType; icon: React.ReactNode; label: string }[] = [
    { type: "main", icon: <Bot className="h-4 w-4" />, label: "Assistant" },
    { type: "script", icon: <FileText className="h-4 w-4" />, label: "Script" },
    { type: "image", icon: <Image className="h-4 w-4" />, label: "Image" },
    { type: "tool", icon: <Hammer className="h-4 w-4" />, label: "Tools" },
    { type: "scene", icon: <Camera className="h-4 w-4" />, label: "Scene" },
    { type: "data", icon: <BarChart className="h-4 w-4" />, label: "Data" },
  ];

  return (
    <div className={`flex ${compact ? "flex-col gap-1" : "flex-row gap-2"}`}>
      {agents.map((agent) => (
        <Button
          key={agent.type}
          size={compact ? "icon" : "sm"}
          variant={currentAgent === agent.type ? "default" : "outline"}
          className={compact 
            ? "h-7 w-7 rounded-md" 
            : "h-8 rounded-md"
          }
          onClick={() => onSwitchAgent(agent.type)}
        >
          {agent.icon}
          {showLabels && !compact && <span className="ml-1">{agent.label}</span>}
        </Button>
      ))}
    </div>
  );
}
