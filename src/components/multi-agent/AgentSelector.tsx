
import { Button } from "@/components/ui/button";
import { Bot, PenLine, Image, Wrench, Info } from "lucide-react";
import { type AgentType } from "@/hooks/use-multi-agent-chat";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface AgentSelectorProps {
  activeAgent: AgentType;
  onAgentSelect: (agent: AgentType) => void;
}

export const AgentSelector = ({ activeAgent, onAgentSelect }: AgentSelectorProps) => {
  const agents = [
    { 
      id: "main" as AgentType, 
      name: "Main Assistant", 
      icon: Bot, 
      description: "General-purpose AI assistant",
      color: "from-blue-400 to-indigo-500"
    },
    { 
      id: "script" as AgentType, 
      name: "Script Writer", 
      icon: PenLine, 
      description: "Specialized in creating scripts, dialogue, and stories",
      color: "from-purple-400 to-pink-500"
    },
    { 
      id: "image" as AgentType, 
      name: "Image Prompt", 
      icon: Image, 
      description: "Creates detailed prompts for AI image generation",
      color: "from-green-400 to-teal-500"
    },
    { 
      id: "tool" as AgentType, 
      name: "Tool Orchestrator", 
      icon: Wrench, 
      description: "Helps you use website tools like image-to-video",
      color: "from-amber-400 to-orange-500"
    },
  ];

  return (
    <div className="bg-gradient-to-r from-[#262B38]/80 to-[#323845]/80 backdrop-blur-sm rounded-xl p-5 mb-6 border border-white/10 shadow-lg animate-fadeIn">
      <h3 className="text-white font-semibold mb-4 flex items-center">
        Select Agent Type
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-1 p-0 h-6 w-6 text-white/60 hover:text-white/80">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#333] text-white border-[#555] max-w-xs">
              <p className="text-sm">Choose the most suitable AI agent for your specific task</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {agents.map((agent) => {
          const isActive = activeAgent === agent.id;
          
          return (
            <TooltipProvider key={agent.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    key={agent.id}
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "relative flex flex-col items-center justify-center h-32 px-3 py-4 overflow-hidden group transition-all duration-300",
                      isActive 
                        ? `bg-gradient-to-br ${agent.color} border border-white/20 shadow-lg` 
                        : "bg-[#333]/70 hover:bg-[#444]/90 text-white border-[#555] hover:border-[#666]"
                    )}
                    onClick={() => onAgentSelect(agent.id)}
                  >
                    {isActive && (
                      <div className="absolute top-0 left-0 h-1 w-full bg-white/30"></div>
                    )}
                    
                    <div className={cn(
                      "rounded-full p-3 mb-2 transition-all duration-300",
                      isActive 
                        ? "bg-white/20" 
                        : "bg-[#444]/50 group-hover:bg-[#555]/50"
                    )}>
                      <agent.icon className={cn("h-6 w-6", isActive ? "text-white" : "text-white/80 group-hover:text-white")} />
                    </div>
                    
                    <span className={cn(
                      "font-medium mb-1 transition-all duration-300",
                      isActive ? "text-white" : "text-white/90 group-hover:text-white"
                    )}>
                      {agent.name}
                    </span>
                    
                    <span className="text-xs text-center line-clamp-2 transition-all duration-300 opacity-80 group-hover:opacity-100">
                      {agent.description}
                    </span>
                    
                    {isActive && (
                      <div className="absolute bottom-0 left-0 w-full mt-2">
                        <Progress value={100} className="h-1 rounded-none" indicatorClassName={`bg-white/30`} />
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#333] text-white border-[#555]">
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs opacity-80">{agent.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};
