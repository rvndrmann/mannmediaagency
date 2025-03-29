
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAgentIcon, getAgentName } from "@/lib/agent-icons";
import { AgentType } from "@/hooks/use-multi-agent-chat";

interface AgentSelectorProps {
  selectedAgentId: string;
  onSelect: (agentId: AgentType) => void;
  disabled?: boolean;
}

export function AgentSelector({
  selectedAgentId,
  onSelect,
  disabled = false,
}: AgentSelectorProps) {
  const agents = [
    { id: "main", name: "Main Assistant" },
    { id: "script", name: "Script Writer" },
    { id: "image", name: "Image Generator" },
    { id: "scene", name: "Scene Creator" },
    { id: "tool", name: "Tool Specialist" },
  ];

  const handleChange = (value: string) => {
    onSelect(value as AgentType);
  };

  const AgentIcon = getAgentIcon(selectedAgentId);

  return (
    <Select value={selectedAgentId} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-[180px] h-8 bg-muted/50">
        <div className="flex items-center">
          <div className={cn(
            "mr-2 h-6 w-6 rounded-md flex items-center justify-center",
            selectedAgentId === "main" && "bg-secondary text-secondary-foreground",
            selectedAgentId === "script" && "bg-blue-500 text-white",
            selectedAgentId === "image" && "bg-purple-500 text-white",
            selectedAgentId === "scene" && "bg-amber-500 text-white",
            selectedAgentId === "tool" && "bg-emerald-500 text-white",
          )}>
            <AgentIcon className="h-4 w-4" />
          </div>
          <SelectValue placeholder="Select Agent">
            {getAgentName(selectedAgentId as AgentType)}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => {
          const Icon = getAgentIcon(agent.id);
          return (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center">
                <div className={cn(
                  "mr-2 h-6 w-6 rounded-md flex items-center justify-center",
                  agent.id === "main" && "bg-secondary text-secondary-foreground",
                  agent.id === "script" && "bg-blue-500 text-white",
                  agent.id === "image" && "bg-purple-500 text-white",
                  agent.id === "scene" && "bg-amber-500 text-white",
                  agent.id === "tool" && "bg-emerald-500 text-white",
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span>{agent.name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
