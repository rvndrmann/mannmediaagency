
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BUILT_IN_AGENT_TYPES, BUILT_IN_TOOL_TYPES, AgentType } from "@/hooks/use-multi-agent-chat";
import { Bot, PenLine, Image, Wrench, Video } from "lucide-react";

interface AgentSelectorProps {
  activeAgent: string;
  onAgentSelect: (agentType: AgentType) => void;
}

export const AgentSelector = ({ 
  activeAgent, 
  onAgentSelect 
}: AgentSelectorProps) => {
  const handleAgentSelect = useCallback((agentType: AgentType) => {
    onAgentSelect(agentType);
  }, [onAgentSelect]);

  // Get icon for agent type
  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case "main": return <Bot className="h-4 w-4" />;
      case "script": return <PenLine className="h-4 w-4" />;
      case "image": return <Image className="h-4 w-4" />;
      case "tool": return <Wrench className="h-4 w-4" />;
      case "scene": return <PenLine className="h-4 w-4" />;
      case "browser": return <Bot className="h-4 w-4" />;
      case "product-video": return <Video className="h-4 w-4" />;
      case "custom-video": return <Video className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  // Get human-readable name for agent type
  const getAgentName = (agentType: string) => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Prompt";
      case "tool": return "Tool Orchestrator";
      case "scene": return "Scene Description";
      case "browser": return "Browser Assistant";
      case "product-video": return "Product Video";
      case "custom-video": return "Video Request";
      default: return agentType.charAt(0).toUpperCase() + agentType.slice(1);
    }
  };

  // Get color for agent type
  const getAgentColor = (agentType: string, isActive: boolean = false) => {
    if (isActive) {
      switch (agentType) {
        case "main": return "bg-gradient-to-r from-blue-600 to-indigo-600";
        case "script": return "bg-gradient-to-r from-purple-600 to-pink-600";
        case "image": return "bg-gradient-to-r from-emerald-600 to-cyan-600";
        case "tool": return "bg-gradient-to-r from-amber-600 to-orange-600";
        case "scene": return "bg-gradient-to-r from-rose-600 to-red-600";
        case "browser": return "bg-gradient-to-r from-gray-600 to-slate-600";
        case "product-video": return "bg-gradient-to-r from-teal-600 to-green-600";
        case "custom-video": return "bg-gradient-to-r from-violet-600 to-fuchsia-600";
        default: return "bg-gradient-to-r from-blue-600 to-indigo-600";
      }
    } else {
      return "bg-[#262B38] hover:bg-[#2D3240]";
    }
  };

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      <div className="text-sm text-gray-400 w-full mb-1 px-1">Select agent type:</div>
      
      <div className="flex flex-wrap gap-1.5">
        {/* Built-in Agents */}
        {BUILT_IN_AGENT_TYPES.map((agentType) => (
          <Button
            key={agentType}
            variant="outline"
            size="sm"
            onClick={() => handleAgentSelect(agentType)}
            className={`h-8 px-2.5 border-[#3A4055] text-white ${
              activeAgent === agentType 
                ? getAgentColor(agentType, true)
                : getAgentColor(agentType)
            }`}
          >
            <span className="flex items-center gap-1.5">
              {getAgentIcon(agentType)}
              <span>{getAgentName(agentType)}</span>
            </span>
          </Button>
        ))}

        {/* Tool Types */}
        {BUILT_IN_TOOL_TYPES.map((toolType) => (
          <Button
            key={toolType}
            variant="outline"
            size="sm"
            onClick={() => handleAgentSelect(toolType)}
            className={`h-8 px-2.5 border-[#3A4055] text-white ${
              activeAgent === toolType 
                ? getAgentColor(toolType, true)
                : getAgentColor(toolType)
            }`}
          >
            <span className="flex items-center gap-1.5">
              {getAgentIcon(toolType)}
              <span>{getAgentName(toolType)}</span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};
