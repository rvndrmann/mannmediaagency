
import { useState } from "react";
import { AgentType, BUILT_IN_AGENT_TYPES } from "@/hooks/use-multi-agent-chat";
import { useCustomAgents } from "@/hooks/use-custom-agents";
import { AgentIconType, AgentInfo } from "@/types/message";
import { 
  Bot, 
  PenLine, 
  Image, 
  Wrench, 
  Code, 
  FileText, 
  Zap, 
  Brain, 
  Lightbulb, 
  Music, 
  Video,
  Plus,
  Globe,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddAgentDialog } from "./AddAgentDialog";
import { EditAgentInstructionsDialog } from "./EditAgentInstructionsDialog";
import { AgentBadge } from "./AgentBadge";

interface AgentSelectorProps {
  activeAgent: AgentType;
  onAgentSelect: (agent: AgentType) => void;
}

export function AgentSelector({ activeAgent, onAgentSelect }: AgentSelectorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentInfo | null>(null);
  const { customAgents, isLoading, createCustomAgent, updateCustomAgent, deleteCustomAgent } = useCustomAgents();

  // Core built-in agents
  const builtInAgents: AgentInfo[] = [
    {
      id: "main",
      name: "Main Assistant",
      description: "General purpose AI assistant for varied tasks",
      icon: "Bot",
      color: "#7c3aed",
      instructions: "You are a helpful AI assistant who responds to user requests in a friendly, conversational manner. You can answer questions, provide information, and help with various tasks."
    },
    {
      id: "script",
      name: "Script Writer",
      description: "Creates detailed scripts for videos and presentations",
      icon: "PenLine",
      color: "#0ea5e9",
      instructions: "You are a professional script writer. Create engaging, structured scripts for videos based on user requests, focusing on clear storytelling and persuasive content."
    },
    {
      id: "image",
      name: "Image Prompt",
      description: "Generates detailed prompts for image creation",
      icon: "Image",
      color: "#f59e0b",
      instructions: "You are an expert at creating detailed image prompts. Generate descriptive, specific prompts that will help create compelling visuals based on user requests."
    },
    {
      id: "tool",
      name: "Tool Orchestrator",
      description: "Specialized in using various tools and APIs",
      icon: "Wrench",
      color: "#10b981",
      instructions: "You are a tool orchestration specialist. Help users by selecting and executing the appropriate tools for their tasks, explaining what tools you're using and why."
    },
    {
      id: "scene",
      name: "Scene Description",
      description: "Creates detailed visual scene descriptions",
      icon: "FileText",
      color: "#8b5cf6",
      instructions: "You are a scene description specialist. Break down scripts into detailed visual scenes with camera angles, movements, and visual elements for video production."
    },
    {
      id: "browser",
      name: "Browser Auto",
      description: "Web browser automation specialist",
      icon: "Globe",
      color: "#3b82f6",
      instructions: "You are a browser automation expert. Help users automate web tasks by generating detailed step-by-step browser instructions that can be executed programmatically."
    },
    {
      id: "product-video",
      name: "Product Video",
      description: "Creates product showcase videos",
      icon: "Video",
      color: "#ef4444",
      instructions: "You are a product video specialist. Create compelling product videos that showcase features and benefits in an engaging visual format."
    },
    {
      id: "custom-video",
      name: "Custom Video",
      description: "Creates custom videos from user specifications",
      icon: "Video",
      color: "#f97316",
      instructions: "You are a custom video creation expert. Help users create unique videos based on their specific requirements and creative vision."
    },
    {
      id: "orchestrator",
      name: "Orchestrator",
      description: "Manages multi-agent workflows for complex tasks",
      icon: "Brain",
      color: "#6366f1",
      instructions: "You are an orchestration specialist. Coordinate multiple specialized agents to complete complex tasks efficiently, breaking down problems and routing to the most suitable agent."
    },
    {
      id: "voiceover",
      name: "Voiceover",
      description: "Creates voiceover scripts and generates audio",
      icon: "Music",
      color: "#ec4899",
      instructions: "You are a voiceover specialist. Create natural, expressive voiceover scripts and help generate professional-sounding audio narration."
    },
    {
      id: "music",
      name: "Music",
      description: "Selects and generates background music",
      icon: "Music",
      color: "#06b6d4",
      instructions: "You are a music specialist. Select appropriate background music for videos that matches the mood, pace, and theme of the content."
    },
    {
      id: "product-shop",
      name: "Product Shop",
      description: "E-commerce and product recommendation specialist",
      icon: "ShoppingBag",
      color: "#64748b",
      instructions: "You are an e-commerce specialist. Help users find products, compare options, and make purchasing decisions with detailed recommendations."
    }
  ];

  // Get the full list of agents (built-in + custom)
  const allAgents = [...builtInAgents, ...customAgents];
  
  // Find the active agent info
  const activeAgentInfo = allAgents.find(agent => agent.id === activeAgent) || builtInAgents[0];

  // Helper function to get the appropriate icon component
  const getIconComponent = (iconType: AgentIconType) => {
    switch (iconType) {
      case "Bot": return <Bot className="h-4 w-4" />;
      case "PenLine": return <PenLine className="h-4 w-4" />;
      case "Image": return <Image className="h-4 w-4" />;
      case "Wrench": return <Wrench className="h-4 w-4" />;
      case "Code": return <Code className="h-4 w-4" />;
      case "FileText": return <FileText className="h-4 w-4" />;
      case "Zap": return <Zap className="h-4 w-4" />;
      case "Brain": return <Brain className="h-4 w-4" />;
      case "Lightbulb": return <Lightbulb className="h-4 w-4" />;
      case "Music": return <Music className="h-4 w-4" />;
      case "Video": return <Video className="h-4 w-4" />;
      case "Globe": return <Globe className="h-4 w-4" />;
      case "ShoppingBag": return <ShoppingBag className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const handleAgentSelect = (agentId: AgentType) => {
    onAgentSelect(agentId);
  };

  const handleCreateAgent = async (formData: any) => {
    const newAgent = await createCustomAgent(formData);
    if (newAgent) {
      setShowAddDialog(false);
    }
  };

  const handleUpdateAgent = async (agentId: string, formData: any) => {
    await updateCustomAgent(agentId, formData);
    setEditAgent(null);
  };

  const handleDeleteAgent = async (agentId: string) => {
    await deleteCustomAgent(agentId);
  };

  return (
    <div className="flex items-center gap-2 py-2 px-4 overflow-x-auto bg-[#21283B]/40 backdrop-blur-sm rounded-xl border border-white/10">
      {allAgents.map((agent) => (
        <Button
          key={agent.id}
          variant={activeAgent === agent.id ? "default" : "outline"}
          onClick={() => handleAgentSelect(agent.id)}
          className="group relative h-9 px-3 text-sm font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors duration-200 hover:bg-secondary hover:text-secondary-foreground"
        >
          {getIconComponent(agent.icon)}
          {agent.name}
          {agent.isCustom && (
            <AgentBadge 
              agent={agent}
              onEdit={() => setEditAgent(agent)}
              onDelete={handleDeleteAgent}
            />
          )}
        </Button>
      ))}
      
      <Button
        variant="ghost"
        onClick={() => setShowAddDialog(true)}
        className="h-9 w-9 p-0 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary hover:text-secondary-foreground"
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">Add Agent</span>
      </Button>

      <AddAgentDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSubmit={handleCreateAgent} />
      
      {editAgent && (
        <EditAgentInstructionsDialog
          open={!!editAgent}
          onOpenChange={(open) => {
            if (!open) setEditAgent(null);
          }}
          agent={editAgent}
          onSubmit={handleUpdateAgent}
        />
      )}
    </div>
  );
}
