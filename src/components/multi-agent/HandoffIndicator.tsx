
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { 
  Sparkles, 
  FileText, 
  Image, 
  Box,
  LayoutTemplate,
  Database,
  ArrowRight
} from "lucide-react";

export interface HandoffIndicatorProps {
  fromAgent: AgentType;
  toAgent: AgentType;
  reason?: string;
  visible?: boolean;
}

export function HandoffIndicator({ fromAgent, toAgent, reason, visible = true }: HandoffIndicatorProps) {
  if (!visible) return null;
  
  const getAgentIcon = (agentType: AgentType) => {
    switch (agentType) {
      case "main":
        return <Sparkles className="h-4 w-4" />;
      case "script":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "tool":
        return <Box className="h-4 w-4" />;
      case "scene":
        return <LayoutTemplate className="h-4 w-4" />;
      case "data":
        return <Database className="h-4 w-4" />;
      case "assistant":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };
  
  const getAgentName = (agentType: AgentType) => {
    switch (agentType) {
      case "main":
        return "Assistant";
      case "script":
        return "Script Writer";
      case "image":
        return "Image Prompt";
      case "tool":
        return "Tool Agent";
      case "scene":
        return "Scene Creator";
      case "data":
        return "Data Agent";
      case "assistant":
        return "AI Assistant";
      default:
        return "Assistant";
    }
  };

  return (
    <div className="flex flex-col gap-1 rounded-md bg-secondary/40 p-2 text-xs mb-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-secondary/60 py-0.5 px-1.5 rounded-sm">
          {getAgentIcon(fromAgent)}
          <span>{getAgentName(fromAgent)}</span>
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className="flex items-center gap-1 bg-primary/10 py-0.5 px-1.5 rounded-sm">
          {getAgentIcon(toAgent)}
          <span>{getAgentName(toAgent)}</span>
        </div>
      </div>
      {reason && (
        <p className="text-muted-foreground text-[10px] mt-1 italic">
          {reason}
        </p>
      )}
    </div>
  );
}
