
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Edit, Save, X } from "lucide-react";
import { AgentInfo } from "@/types/message";
import { useCustomAgents } from "@/hooks/use-custom-agents";
import { Textarea } from "@/components/ui/textarea";

type AgentInstructionsTableProps = {
  activeAgent: AgentType;
};

export const AgentInstructionsTable = ({ activeAgent }: AgentInstructionsTableProps) => {
  const [editingAgentId, setEditingAgentId] = React.useState<string | null>(null);
  const [editInstructions, setEditInstructions] = React.useState("");
  const { customAgents, updateCustomAgent } = useCustomAgents();
  
  // Define built-in agents with default instructions
  const builtInAgents: AgentInfo[] = [
    {
      id: "main",
      name: "General Assistant",
      description: "General-purpose AI assistant",
      icon: "Bot",
      color: "from-blue-400 to-indigo-500",
      instructions: "Help users with a wide range of tasks and questions."
    },
    {
      id: "script",
      name: "Script Writer",
      description: "Specialized in creating scripts",
      icon: "PenLine",
      color: "from-purple-400 to-pink-500",
      instructions: "Create compelling scripts, dialogue, and narrative content."
    },
    {
      id: "image",
      name: "Image Prompt Creator",
      description: "Creates detailed prompts for images",
      icon: "Image",
      color: "from-green-400 to-teal-500",
      instructions: "Generate detailed, creative prompts for AI image generation."
    },
    {
      id: "tool",
      name: "Tool Orchestrator",
      description: "Helps users use various tools",
      icon: "Wrench",
      color: "from-amber-400 to-orange-500",
      instructions: "Guide users in using tools like image-to-video conversion, product-shot-v1 for basic product images, and product-shot-v2 for advanced product shots with scene composition and customization options. Recommend product-shot-v2 for higher quality product images."
    }
  ];

  // Combine built-in and custom agents
  const allAgents = [...builtInAgents, ...customAgents];

  const startEditing = (agent: AgentInfo) => {
    setEditingAgentId(agent.id);
    setEditInstructions(agent.instructions);
  };

  const saveInstructions = async (agentId: string) => {
    const agent = customAgents.find(a => a.id === agentId);
    
    if (agent) {
      // Only custom agents can be edited via this method
      await updateCustomAgent(agentId, {
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        color: agent.color,
        instructions: editInstructions
      });
    }
    
    setEditingAgentId(null);
  };

  const cancelEditing = () => {
    setEditingAgentId(null);
    setEditInstructions("");
  };

  return (
    <div className="p-4 bg-[#1D2232] rounded-lg border border-gray-800 mt-4">
      <h3 className="text-lg font-medium text-white mb-4">Agent Instructions</h3>
      
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Agent Type</TableHead>
            <TableHead className="w-[150px]">Name</TableHead>
            <TableHead className="w-[200px]">Description</TableHead>
            <TableHead>Instructions</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allAgents.map((agent) => (
            <TableRow 
              key={agent.id}
              className={`${agent.id === activeAgent ? "bg-gray-800/30" : ""}`}
            >
              <TableCell className="font-medium">
                {agent.isCustom ? "Custom" : agent.id}
              </TableCell>
              <TableCell>{agent.name}</TableCell>
              <TableCell>{agent.description}</TableCell>
              <TableCell>
                {editingAgentId === agent.id ? (
                  <Textarea 
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    className="bg-gray-900 min-h-[80px] text-sm"
                    rows={3} 
                  />
                ) : (
                  <div className="text-sm max-w-md truncate">{agent.instructions}</div>
                )}
              </TableCell>
              <TableCell>
                {editingAgentId === agent.id ? (
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => saveInstructions(agent.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={cancelEditing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => startEditing(agent)}
                    disabled={!agent.isCustom && agent.id !== activeAgent}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
