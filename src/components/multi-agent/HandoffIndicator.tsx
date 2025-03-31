
import React from "react";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { Bot, FileText, Image, Hammer, Camera, BarChart, Zap } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HandoffIndicatorProps {
  fromAgent: AgentType;
  toAgent: AgentType;
  reason?: string;
}

export function HandoffIndicator({ fromAgent, toAgent, reason }: HandoffIndicatorProps) {
  const agentNames: Record<AgentType, string> = {
    main: "Assistant",
    assistant: "Assistant",
    script: "Script Writer",
    image: "Image Generator",
    tool: "Tool Specialist",
    scene: "Scene Creator",
    data: "Data Analyst"
  };

  const agentIcons: Record<AgentType, React.ReactNode> = {
    main: <Bot className="h-4 w-4" />,
    assistant: <Bot className="h-4 w-4" />,
    script: <FileText className="h-4 w-4" />,
    image: <Image className="h-4 w-4" />,
    tool: <Hammer className="h-4 w-4" />,
    scene: <Camera className="h-4 w-4" />,
    data: <BarChart className="h-4 w-4" />
  };

  return (
    <div className="my-2 p-2 rounded-md bg-muted/50 border border-border text-xs">
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium">Handoff Detected</div>
        <Tabs defaultValue={toAgent} className="h-6">
          <TabsList className="h-6 p-0">
            <TabsTrigger value={fromAgent} className="h-6 px-2 text-xs">
              {agentIcons[fromAgent]}
              <span className="ml-1">{agentNames[fromAgent]}</span>
            </TabsTrigger>
            <div className="flex items-center px-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
            </div>
            <TabsTrigger value={toAgent} className="h-6 px-2 text-xs">
              {agentIcons[toAgent]}
              <span className="ml-1">{agentNames[toAgent]}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {reason && (
        <div className="text-muted-foreground">
          <span className="font-medium">Reason:</span> {reason}
        </div>
      )}
    </div>
  );
}
