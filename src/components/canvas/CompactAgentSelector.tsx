
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Bot, 
  Palette, 
  Video, 
  FileText, 
  Wand2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Define agent types locally since we removed the import
export type AgentType = 'content' | 'visual' | 'video' | 'script' | 'general';

const AGENT_CONFIGS = {
  content: {
    name: "Content Agent",
    icon: FileText,
    color: "from-blue-400 to-indigo-500",
    description: "Specializes in writing scripts, descriptions, and voice-over text"
  },
  visual: {
    name: "Visual Agent", 
    icon: Palette,
    color: "from-purple-400 to-pink-500",
    description: "Creates image prompts and manages visual elements"
  },
  video: {
    name: "Video Agent",
    icon: Video,
    color: "from-green-400 to-emerald-500", 
    description: "Handles video generation and editing tasks"
  },
  script: {
    name: "Script Agent",
    icon: FileText,
    color: "from-orange-400 to-red-500",
    description: "Focuses on script writing and narrative structure"
  },
  general: {
    name: "General Agent",
    icon: Bot,
    color: "from-gray-400 to-slate-500",
    description: "Handles general tasks and coordination"
  }
};

interface CompactAgentSelectorProps {
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  isProcessing?: boolean;
}

export function CompactAgentSelector({ 
  selectedAgent, 
  onAgentChange, 
  isProcessing = false 
}: CompactAgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentAgent = AGENT_CONFIGS[selectedAgent];
  const CurrentIcon = currentAgent.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={isProcessing}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded bg-gradient-to-r ${currentAgent.color}`}>
              <CurrentIcon className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm">{currentAgent.name}</span>
            {isProcessing && (
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                Active
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-2 mt-2">
        {Object.entries(AGENT_CONFIGS).map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = key === selectedAgent;
          
          return (
            <Button
              key={key}
              variant={isSelected ? "default" : "ghost"}
              className="w-full justify-start h-auto p-3"
              onClick={() => onAgentChange(key as AgentType)}
              disabled={isProcessing}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded bg-gradient-to-r ${config.color} flex-shrink-0`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{config.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {config.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
