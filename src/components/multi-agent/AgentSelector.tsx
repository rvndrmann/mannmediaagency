
import { Button } from "@/components/ui/button";
import { Bot, PenLine, Image, Wrench, Info, Plus, Trash, Edit, FileText, Globe, Video, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { type AgentType, BUILT_IN_AGENT_TYPES, BUILT_IN_TOOL_TYPES } from "@/hooks/use-multi-agent-chat";
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

  // Updated builtInAgents array - browser, product-video, and custom-video are moved to toolAgents
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
    }
  ];
  
  // These are now tools, not agents - they will be presented differently in the UI
  const toolAgents: AgentInfo[] = [
    { 
      id: "browser", 
      name: "Browser Tool", 
      description: "Tool for browser automation - not an agent",
      icon: "Globe", 
      color: "from-cyan-400 to-blue-500",
      instructions: "",
      isTool: true
    },
    { 
      id: "product-video", 
      name: "Product Video", 
      description: "Tool for product video creation - not an agent",
      icon: "Video", 
      color: "from-red-400 to-rose-500",
      instructions: "",
      isTool: true
    },
    { 
      id: "custom-video", 
      name: "Custom Video", 
      description: "Tool for custom video requests - not an agent",
      icon: "ShoppingBag", 
      color: "from-pink-400 to-purple-500",
      instructions: "",
      isTool: true
    },
  ];

  const allAgents = [...builtInAgents, ...customAgents, ...toolAgents];

  const handleCreateAgent = async (data: CustomAgentFormData) => {
    const newAgent = await createCustomAgent(data);
    if (newAgent) {
      setShowAddDialog(false);
    }
  };

  const handleEditAgent = async (data: CustomAgentFormData) => {
    if (agentToEdit) {
      await updateCustomAgent(agentToEdit.id, data);
      setAgentToEdit(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (agentToDelete) {
      await deleteCustomAgent(agentToDelete);
      if (agentToDelete === activeAgent) {
        onAgentSelect("main");
      }
      setAgentToDelete(null);
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Bot": return Bot;
      case "PenLine": return PenLine;
      case "Image": return Image;
      case "Wrench": return Wrench;
      case "FileText": return FileText;
      case "Globe": return Globe;
      case "Video": return Video;
      case "ShoppingBag": return ShoppingBag;
      case "Edit": return Edit;
      case "Trash": return Trash;
      default: return Bot;
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#262B38]/80 to-[#323845]/80 backdrop-blur-sm rounded-xl p-2 mb-3 border border-white/10 shadow-lg animate-fadeIn">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-white text-xs font-semibold flex items-center">
          Select Agent Type
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-1 p-0 h-4 w-4 text-white/60 hover:text-white/80">
                  <Info className="h-2.5 w-2.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#333] text-white border-[#555] max-w-xs">
                <p className="text-xs">Choose the most suitable AI agent for your specific task</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowAddDialog(true)}
          className="text-xs flex items-center gap-1 border-gray-600 bg-gray-800/50 hover:bg-gray-700/70 h-5 px-1.5 py-0.5"
        >
          <Plus className="h-2.5 w-2.5" />
          Add Agent
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-1">
        {allAgents.map((agent) => {
          const isActive = activeAgent === agent.id;
          const IconComponent = getIconComponent(agent.icon);
          const isCustom = 'isCustom' in agent && agent.isCustom;
          const isBuiltIn = BUILT_IN_AGENT_TYPES.includes(agent.id as any);
          const isTool = 'isTool' in agent && agent.isTool;
          
          return (
            <div key={agent.id} className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "outline"}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-[40px] w-full px-1 py-1 overflow-hidden group transition-all duration-300",
                        isActive 
                          ? `bg-gradient-to-br ${agent.color} border border-white/20 shadow-lg` 
                          : isTool 
                            ? "bg-[#444]/50 hover:bg-[#555]/80 text-white border-gray-700 hover:border-gray-600" 
                            : "bg-[#333]/70 hover:bg-[#444]/90 text-white border-[#555] hover:border-[#666]"
                      )}
                      onClick={() => isTool ? onAgentSelect("tool") : onAgentSelect(agent.id)}
                    >
                      {isActive && (
                        <div className="absolute top-0 left-0 h-0.5 w-full bg-white/30"></div>
                      )}
                      
                      <div className={cn(
                        "rounded-full p-1 mb-0.5 transition-all duration-300",
                        isActive 
                          ? "bg-white/20" 
                          : isTool
                            ? "bg-[#333]/60 group-hover:bg-[#444]/60"
                            : "bg-[#444]/50 group-hover:bg-[#555]/50"
                      )}>
                        <IconComponent className={cn("h-3 w-3", 
                          isActive 
                            ? "text-white" 
                            : isTool
                              ? "text-white/70 group-hover:text-white"
                              : "text-white/80 group-hover:text-white"
                        )} />
                      </div>
                      
                      <span className={cn(
                        "font-medium text-[8px] transition-all duration-300",
                        isActive 
                          ? "text-white" 
                          : isTool
                            ? "text-white/80 group-hover:text-white"
                            : "text-white/90 group-hover:text-white"
                      )}>
                        {agent.name}
                        {isTool && <span className="text-[6px] opacity-70 block">Use Tool Agent</span>}
                      </span>
                      
                      {isActive && (
                        <div className="absolute bottom-0 left-0 w-full">
                          <Progress value={100} className="h-0.5 rounded-none" indicatorClassName={`bg-white/30`} />
                        </div>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#333] text-white border-[#555]">
                    {isTool ? (
                      <>
                        <p className="text-xs font-medium">{agent.name} (Tool)</p>
                        <p className="text-[10px] opacity-80">This is a tool, not an agent. Use the Tool Orchestrator agent to access it.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium">{agent.name}</p>
                        <p className="text-[10px] opacity-80">{agent.description}</p>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {isCustom && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-0.5 right-0.5 h-3.5 w-3.5 bg-black/20 hover:bg-black/40 text-white/70 p-0"
                    >
                      <span className="sr-only">Open menu</span>
                      <svg 
                        width="15" 
                        height="15" 
                        viewBox="0 0 15 15" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-2 w-2"
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
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-red-400 cursor-pointer hover:bg-gray-800 hover:text-red-300"
                      onClick={() => setAgentToDelete(agent.id)}
                    >
                      <Trash className="h-3 w-3" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      <AddAgentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleCreateAgent}
      />

      {agentToEdit && (
        <AddAgentDialog
          open={!!agentToEdit}
          onOpenChange={(open) => !open && setAgentToEdit(null)}
          onSubmit={handleEditAgent}
          editAgent={agentToEdit}
          title="Edit Custom Agent"
        />
      )}

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
}
