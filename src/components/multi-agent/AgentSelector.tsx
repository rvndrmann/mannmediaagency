
import { Button } from "@/components/ui/button";
import { Bot, PenLine, Image, Wrench, Info, Plus, Trash, Edit, FileText } from "lucide-react";
import { useState } from "react";
import { type AgentType, BUILT_IN_AGENT_TYPES } from "@/hooks/use-multi-agent-chat";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { AddAgentDialog } from "./AddAgentDialog";
import { useCustomAgents, CustomAgentFormData } from "@/hooks/use-custom-agents";
import { AgentInfo } from "@/types/message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AgentSelectorProps {
  activeAgent: AgentType;
  onAgentSelect: (agent: AgentType) => void;
}

export const AgentSelector = ({ activeAgent, onAgentSelect }: AgentSelectorProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<AgentInfo | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  
  const { 
    customAgents, 
    createCustomAgent, 
    updateCustomAgent, 
    deleteCustomAgent, 
    isLoading: isLoadingCustomAgents 
  } = useCustomAgents();

  // Define built-in agents
  const builtInAgents: AgentInfo[] = [
    { 
      id: "main", 
      name: "Main Assistant", 
      description: "General-purpose AI assistant",
      icon: "Bot", 
      color: "from-blue-400 to-indigo-500",
      instructions: ""
    },
    { 
      id: "script", 
      name: "Script Writer", 
      description: "Specialized in creating scripts, dialogue, and stories",
      icon: "PenLine", 
      color: "from-purple-400 to-pink-500",
      instructions: ""
    },
    { 
      id: "image", 
      name: "Image Prompt", 
      description: "Creates detailed prompts for AI image generation",
      icon: "Image", 
      color: "from-green-400 to-teal-500",
      instructions: ""
    },
    { 
      id: "tool", 
      name: "Tool Orchestrator", 
      description: "Helps you use website tools like image-to-video",
      icon: "Wrench", 
      color: "from-amber-400 to-orange-500",
      instructions: ""
    },
    { 
      id: "scene", 
      name: "Scene Description", 
      description: "Creates vivid scene descriptions for visual content",
      icon: "FileText", 
      color: "from-emerald-400 to-teal-500",
      instructions: ""
    },
  ];

  // Combine built-in and custom agents
  const allAgents = [...builtInAgents, ...customAgents];

  // Handle create agent submission
  const handleCreateAgent = async (data: CustomAgentFormData) => {
    const newAgent = await createCustomAgent(data);
    if (newAgent) {
      setShowAddDialog(false);
    }
  };

  // Handle edit agent submission
  const handleEditAgent = async (data: CustomAgentFormData) => {
    if (agentToEdit) {
      await updateCustomAgent(agentToEdit.id, data);
      setAgentToEdit(null);
    }
  };

  // Handle agent deletion
  const handleDeleteConfirm = async () => {
    if (agentToDelete) {
      await deleteCustomAgent(agentToDelete);
      // If the deleted agent was active, switch to main
      if (agentToDelete === activeAgent) {
        onAgentSelect("main");
      }
      setAgentToDelete(null);
    }
  };

  // Get icon component based on string name
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Bot": return Bot;
      case "PenLine": return PenLine;
      case "Image": return Image;
      case "Wrench": return Wrench;
      case "FileText": return FileText;
      case "Edit": return Edit;
      case "Trash": return Trash;
      default: return Bot;
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#262B38]/80 to-[#323845]/80 backdrop-blur-sm rounded-xl p-5 mb-6 border border-white/10 shadow-lg animate-fadeIn">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold flex items-center">
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
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowAddDialog(true)}
          className="text-xs flex items-center gap-1 border-gray-600 bg-gray-800/50 hover:bg-gray-700/70"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Agent
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {allAgents.map((agent) => {
          const isActive = activeAgent === agent.id;
          const IconComponent = getIconComponent(agent.icon);
          const isCustom = 'isCustom' in agent && agent.isCustom;
          const isBuiltIn = BUILT_IN_AGENT_TYPES.includes(agent.id);
          
          return (
            <div key={agent.id} className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "outline"}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-32 w-full px-3 py-4 overflow-hidden group transition-all duration-300",
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
                        <IconComponent className={cn("h-6 w-6", isActive ? "text-white" : "text-white/80 group-hover:text-white")} />
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
              
              {/* Menu for custom agents */}
              {isCustom && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-7 w-7 bg-black/20 hover:bg-black/40 text-white/70"
                    >
                      <span className="sr-only">Open menu</span>
                      <svg 
                        width="15" 
                        height="15" 
                        viewBox="0 0 15 15" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3 w-3"
                      >
                        <path 
                          d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" 
                          fill="currentColor" 
                          fillRule="evenodd" 
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white min-w-[120px]">
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-800"
                      onClick={() => setAgentToEdit(agent)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-red-400 cursor-pointer hover:bg-gray-800 hover:text-red-300"
                      onClick={() => setAgentToDelete(agent.id)}
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* Add agent dialog */}
      <AddAgentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleCreateAgent}
      />

      {/* Edit agent dialog */}
      {agentToEdit && (
        <AddAgentDialog
          open={!!agentToEdit}
          onOpenChange={(open) => !open && setAgentToEdit(null)}
          onSubmit={handleEditAgent}
          editAgent={agentToEdit}
          title="Edit Custom Agent"
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!agentToDelete} onOpenChange={(open) => !open && setAgentToDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Agent</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this custom agent? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
