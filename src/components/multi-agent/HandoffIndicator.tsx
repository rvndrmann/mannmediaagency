import React, { memo } from 'react';
import { ArrowRightCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AgentType } from '@/hooks/use-multi-agent-chat';

interface HandoffIndicatorProps {
  fromAgent: AgentType;
  toAgent: AgentType;
  handoffReason?: string;
  isInProgress?: boolean;
  handoffId?: string;
  visible?: boolean;
}

const agentLabels: Record<AgentType, string> = {
  main: "Main Assistant",
  script: "Script Writer",
  image: "Image Generator",
  tool: "Tool Specialist",
  scene: "Scene Creator",
  data: "Data Specialist"
};

export const HandoffIndicator = memo(function HandoffIndicator({
  fromAgent,
  toAgent,
  handoffReason,
  isInProgress = false,
  handoffId,
  visible = true
}: HandoffIndicatorProps) {
  if (!visible) return null;
  
  // Format agent name for display
  const formatAgentName = (agent: AgentType) => {
    return agent.charAt(0).toUpperCase() + agent.slice(1) + ' Agent';
  };

  // Color mappings for different agents
  const getAgentColor = (agent: AgentType): string => {
    const colorMap: Record<AgentType, string> = {
      main: 'bg-blue-600 hover:bg-blue-700',
      image: 'bg-purple-600 hover:bg-purple-700',
      script: 'bg-green-600 hover:bg-green-700',
      scene: 'bg-orange-600 hover:bg-orange-700',
      tool: 'bg-teal-600 hover:bg-teal-700',
      data: 'bg-amber-600 hover:bg-amber-700',
    };
    
    return colorMap[agent] || 'bg-gray-600 hover:bg-gray-700';
  };

  return (
    <div className="my-3 px-2" aria-live="polite" role="status">
      <Alert className="bg-gray-800/50 border border-gray-700">
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={`${getAgentColor(fromAgent)} text-xs cursor-help`}>
                    {formatAgentName(fromAgent)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 text-white border-gray-700">
                  <p>Handing off from {formatAgentName(fromAgent)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex items-center">
              {isInProgress ? (
                <Loader2 className="h-4 w-4 text-gray-400 animate-spin mx-2" />
              ) : (
                <ArrowRightCircle className="h-4 w-4 text-gray-400 mx-2" />
              )}
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={`${getAgentColor(toAgent)} text-xs cursor-help`}>
                    {formatAgentName(toAgent)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 text-white border-gray-700">
                  <p>Handing off to {formatAgentName(toAgent)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {handoffReason && (
            <div className="text-xs text-gray-400 max-w-[70%] truncate" title={handoffReason}>
              {isInProgress ? "Handoff in progress: " : "Reason: "}
              {handoffReason}
            </div>
          )}
        </AlertDescription>
      </Alert>
      
      {handoffId && (
        <div className="text-[10px] text-gray-500 mt-1 text-right">
          Handoff ID: {handoffId.slice(0, 8)}
        </div>
      )}
    </div>
  );
});
