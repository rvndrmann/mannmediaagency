
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { FileText, Image, ArrowRight, Wrench, PenSquare, Database } from "lucide-react";

interface HandoffIndicatorProps {
  fromAgent: AgentType;
  toAgent: AgentType;
  visible: boolean;
}

const getAgentIcon = (agentType: AgentType) => {
  switch (agentType) {
    case "script":
      return <FileText className="w-5 h-5 text-blue-400" />;
    case "image":
      return <Image className="w-5 h-5 text-purple-400" />;
    case "tool":
      return <Wrench className="w-5 h-5 text-green-400" />;
    case "scene":
      return <PenSquare className="w-5 h-5 text-amber-400" />;
    case "data":
      return <Database className="w-5 h-5 text-cyan-400" />; // Add Data agent icon
    default:
      return null;
  }
};

const getAgentName = (agentType: AgentType): string => {
  switch (agentType) {
    case "main": return "Main Assistant";
    case "script": return "Script Writer";
    case "image": return "Image Generator";
    case "tool": return "Tool Specialist";
    case "scene": return "Scene Creator";
    case "data": return "Data Agent"; // Add Data agent name
    default: return "Assistant";
  }
};

export function HandoffIndicator({ fromAgent, toAgent, visible }: HandoffIndicatorProps) {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-x-0 bottom-4 flex justify-center z-50 pointer-events-none">
      <div className="bg-[#21283B]/90 backdrop-blur-sm rounded-lg border border-white/10 text-white shadow-lg px-4 py-2 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1">
          {getAgentIcon(fromAgent) || <div className="w-5 h-5 rounded-full bg-blue-500" />}
          <span className="text-sm font-medium">{getAgentName(fromAgent)}</span>
        </div>
        
        <ArrowRight className="text-gray-400 w-4 h-4" />
        
        <div className="flex items-center gap-1">
          {getAgentIcon(toAgent) || <div className="w-5 h-5 rounded-full bg-green-500" />}
          <span className="text-sm font-medium">{getAgentName(toAgent)}</span>
        </div>
        
        <span className="text-xs text-gray-400 ml-2">Handoff in progress...</span>
      </div>
    </div>
  );
}
