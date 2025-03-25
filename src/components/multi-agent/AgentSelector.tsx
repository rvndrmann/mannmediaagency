
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  PenLine, 
  Image, 
  Wrench, 
  Theater, 
  Plus,
  Zap,
  Brain,
  Lightbulb,
  Music,
  Video,
  Globe,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { AddAgentDialog } from "./AddAgentDialog";
import { useCustomAgents } from "@/hooks/use-custom-agents";
import { CustomAgentFormData } from "@/hooks/use-custom-agents";
import { toast } from "sonner";

// Map of built-in agent types to their icons
const AGENT_ICONS = {
  main: Bot,
  script: PenLine,
  image: Image,
  tool: Wrench,
  scene: Theater,
  browser: Globe,
  'product-video': Video,
  'custom-video': Video
};

const AGENT_COLORS = {
  main: "from-blue-400 to-indigo-500",
  script: "from-pink-400 to-rose-500",
  image: "from-green-400 to-teal-500",
  tool: "from-amber-400 to-orange-500",
  scene: "from-purple-400 to-fuchsia-500",
  browser: "from-cyan-400 to-blue-500",
  'product-video': "from-red-400 to-rose-500",
  'custom-video': "from-emerald-400 to-green-500"
};

const AGENT_NAMES = {
  main: "Main Assistant",
  script: "Script Writer",
  image: "Image Prompt",
  tool: "Tool Agent",
  scene: "Scene Creator",
  browser: "Browser Agent",
  'product-video': "Product Video",
  'custom-video': "Custom Video"
};

// Custom agent type map for icons
const CUSTOM_AGENT_ICON_MAP: Record<string, any> = {
  Bot: Bot,
  PenLine: PenLine,
  Image: Image,
  Wrench: Wrench,
  Zap: Zap,
  Brain: Brain,
  Lightbulb: Lightbulb,
  Music: Music,
  Video: Video,
  Globe: Globe,
  ShoppingBag: ShoppingBag
};

interface AgentSelectorProps {
  activeAgent: AgentType;
  onAgentSelect: (agentType: AgentType) => void;
}

export const AgentSelector = ({ activeAgent, onAgentSelect }: AgentSelectorProps) => {
  const [showAddAgentDialog, setShowAddAgentDialog] = useState(false);
  const { agents, addAgent, updateAgent, deleteAgent, getAgent } = useCustomAgents();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define built-in agent types
  const builtInAgents = [
    { type: "main", name: AGENT_NAMES.main, icon: AGENT_ICONS.main, color: AGENT_COLORS.main },
    { type: "script", name: AGENT_NAMES.script, icon: AGENT_ICONS.script, color: AGENT_COLORS.script },
    { type: "image", name: AGENT_NAMES.image, icon: AGENT_ICONS.image, color: AGENT_COLORS.image },
    { type: "tool", name: AGENT_NAMES.tool, icon: AGENT_ICONS.tool, color: AGENT_COLORS.tool },
    { type: "scene", name: AGENT_NAMES.scene, icon: AGENT_ICONS.scene, color: AGENT_COLORS.scene }
  ];

  const handleCreateAgent = async (formData: CustomAgentFormData) => {
    try {
      setIsSubmitting(true);
      await addAgent(formData);
      setShowAddAgentDialog(false);
      toast.success("Custom agent created successfully!");
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error("Failed to create custom agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="text-xs text-gray-400 mb-2 px-1">Select Agent</div>
      <div className="flex flex-wrap gap-2">
        {builtInAgents.map((agent) => {
          const IconComponent = agent.icon;
          return (
            <Button
              key={agent.type}
              variant={activeAgent === agent.type ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-auto py-1.5 px-2 transition-all flex items-center",
                activeAgent === agent.type
                  ? `bg-gradient-to-r ${agent.color} text-white border-transparent`
                  : "hover:bg-gray-100/50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50"
              )}
              onClick={() => onAgentSelect(agent.type as AgentType)}
            >
              <IconComponent className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium">{agent.name}</span>
            </Button>
          );
        })}

        {agents.map((agent) => {
          const IconComponent = CUSTOM_AGENT_ICON_MAP[agent.icon] || Bot;
          return (
            <Button
              key={agent.id}
              variant={activeAgent === agent.id ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-auto py-1.5 px-2 transition-all flex items-center",
                activeAgent === agent.id
                  ? `bg-gradient-to-r ${agent.color} text-white border-transparent`
                  : "hover:bg-gray-100/50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50"
              )}
              onClick={() => onAgentSelect(agent.id as AgentType)}
            >
              <IconComponent className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium">{agent.name}</span>
            </Button>
          );
        })}

        {/* Add New Agent Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-auto py-1.5 px-2 transition-all flex items-center bg-gray-700/30 hover:bg-gray-700/50 text-gray-300"
          onClick={() => setShowAddAgentDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Add Agent</span>
        </Button>
      </div>

      <AddAgentDialog
        open={showAddAgentDialog}
        onOpenChange={setShowAddAgentDialog}
        onSubmit={handleCreateAgent}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
