
import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { cn } from "@/lib/utils";

interface HandoffIndicatorProps {
  fromAgent: AgentType;
  toAgent: AgentType;
  visible: boolean;
  onFinish?: () => void;
}

export function HandoffIndicator({ fromAgent, toAgent, visible, onFinish }: HandoffIndicatorProps) {
  const [animationComplete, setAnimationComplete] = useState(false);
  
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setAnimationComplete(true);
        if (onFinish) onFinish();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setAnimationComplete(false);
    }
  }, [visible, onFinish]);
  
  if (!visible) return null;
  
  const getAgentName = (type: AgentType): string => {
    switch (type) {
      case 'main': return 'Main Assistant';
      case 'script': return 'Script Writer';
      case 'image': return 'Image Prompt';
      case 'tool': return 'Tool Orchestrator';
      case 'scene': return 'Scene Creator';
      default: return type;
    }
  };
  
  return (
    <div className={cn(
      "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50",
      "bg-[#1A1F29] border border-white/20 rounded-lg px-5 py-4",
      "flex flex-col items-center gap-3 shadow-lg",
      "transition-opacity duration-500",
      animationComplete ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">{fromAgent[0].toUpperCase()}</span>
          </div>
          <span className="text-xs text-white/70 mt-1">{getAgentName(fromAgent)}</span>
        </div>
        
        <ArrowRightLeft className="h-5 w-5 text-white/60 animate-pulse" />
        
        <div className="flex flex-col items-center">
          <div className="bg-green-600 w-10 h-10 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">{toAgent[0].toUpperCase()}</span>
          </div>
          <span className="text-xs text-white/70 mt-1">{getAgentName(toAgent)}</span>
        </div>
      </div>
      
      <p className="text-xs text-white/80 text-center">
        Transferring to specialized agent...
      </p>
    </div>
  );
}
