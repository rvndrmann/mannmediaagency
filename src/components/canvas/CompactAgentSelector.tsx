
import React from 'react';
import { Button } from "@/components/ui/button";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import {
  Brain,
  Image as ImageIcon,
  FileText,
  Video,
  Wrench,
  Database
} from "lucide-react";

interface CompactAgentSelectorProps {
  selectedAgent: AgentType;
  onSelect: (agentType: AgentType) => void;
}

export function CompactAgentSelector({ selectedAgent, onSelect }: CompactAgentSelectorProps) {
  const agents: { id: AgentType; icon: React.ReactNode; tooltip: string }[] = [
    { id: "main", icon: <Brain className="h-4 w-4" />, tooltip: "Main Assistant" },
    { id: "image", icon: <ImageIcon className="h-4 w-4" />, tooltip: "Image Generator" },
    { id: "script", icon: <FileText className="h-4 w-4" />, tooltip: "Script Writer" },
    { id: "scene", icon: <Video className="h-4 w-4" />, tooltip: "Scene Creator" },
    { id: "tool", icon: <Wrench className="h-4 w-4" />, tooltip: "Tool Agent" },
    { id: "data", icon: <Database className="h-4 w-4" />, tooltip: "Data Agent" },
  ];

  return (
    <div className="flex gap-1 p-2 bg-gray-900/60 backdrop-blur-sm rounded-lg border border-gray-800">
      {agents.map((agent) => (
        <Button
          key={agent.id}
          variant={selectedAgent === agent.id ? "default" : "outline"}
          size="sm"
          className={`h-8 w-8 p-0 ${
            selectedAgent === agent.id
              ? "bg-gradient-to-r from-blue-600 to-indigo-600"
              : "bg-gray-800/50 border-gray-700 hover:bg-gray-700/80"
          }`}
          onClick={() => onSelect(agent.id)}
          title={agent.tooltip}
        >
          {agent.icon}
        </Button>
      ))}
    </div>
  );
}
