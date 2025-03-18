
import { Button } from "@/components/ui/button";
import { Bot, PenLine, Image, Wrench } from "lucide-react";
import { type AgentType } from "@/hooks/use-multi-agent-chat";

interface AgentSelectorProps {
  activeAgent: AgentType;
  onAgentSelect: (agent: AgentType) => void;
}

export const AgentSelector = ({ activeAgent, onAgentSelect }: AgentSelectorProps) => {
  const agents = [
    { id: "main" as AgentType, name: "Main Assistant", icon: Bot, description: "General-purpose AI assistant" },
    { id: "script" as AgentType, name: "Script Writer", icon: PenLine, description: "Specialized in creating scripts, dialogue, and stories" },
    { id: "image" as AgentType, name: "Image Prompt", icon: Image, description: "Creates detailed prompts for AI image generation" },
    { id: "tool" as AgentType, name: "Tool Orchestrator", icon: Wrench, description: "Helps you use website tools like image-to-video" },
  ];

  return (
    <div className="bg-[#262B38] rounded-lg p-4 mb-4">
      <h3 className="text-white font-medium mb-3">Select Agent Type</h3>
      <div className="grid grid-cols-2 gap-2">
        {agents.map((agent) => (
          <Button
            key={agent.id}
            variant={activeAgent === agent.id ? "default" : "outline"}
            className={`flex flex-col items-center justify-center h-24 px-2 py-3 text-sm ${
              activeAgent === agent.id 
                ? "bg-[#9b87f5] hover:bg-[#8a77e1] text-white" 
                : "bg-[#333] hover:bg-[#444] text-white border-[#555]"
            }`}
            onClick={() => onAgentSelect(agent.id)}
          >
            <agent.icon className="h-6 w-6 mb-2" />
            <span className="font-medium mb-1">{agent.name}</span>
            <span className="text-xs opacity-80 text-center line-clamp-2">{agent.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
