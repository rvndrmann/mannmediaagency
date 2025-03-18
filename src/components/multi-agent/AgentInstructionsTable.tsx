
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Save } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type AgentInstruction = {
  type: AgentType;
  name: string;
  description: string;
  instructions: string;
};

type AgentInstructionsTableProps = {
  activeAgent: AgentType;
};

export const AgentInstructionsTable = ({ activeAgent }: AgentInstructionsTableProps) => {
  const [agentInstructions, setAgentInstructions] = useState<AgentInstruction[]>(() => {
    const savedInstructions = localStorage.getItem("agent_instructions");
    if (savedInstructions) {
      try {
        return JSON.parse(savedInstructions);
      } catch (e) {
        console.error("Error parsing saved agent instructions:", e);
      }
    }

    // Default instructions
    return [
      {
        type: "main",
        name: "General Assistant",
        description: "General-purpose AI assistant",
        instructions: "Help users with a wide range of tasks and questions."
      },
      {
        type: "script",
        name: "Script Writer",
        description: "Specialized in creating scripts",
        instructions: "Create compelling scripts, dialogue, and narrative content."
      },
      {
        type: "image",
        name: "Image Prompt Creator",
        description: "Creates detailed prompts for images",
        instructions: "Generate detailed, creative prompts for AI image generation."
      },
      {
        type: "tool",
        name: "Tool Orchestrator",
        description: "Helps users use various tools",
        instructions: "Guide users in using tools like image-to-video conversion and product shot generation."
      }
    ];
  });

  const [editingAgentType, setEditingAgentType] = useState<AgentType | null>(null);
  
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      instructions: ""
    }
  });

  const startEditing = (agentType: AgentType) => {
    const agent = agentInstructions.find(a => a.type === agentType);
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description,
        instructions: agent.instructions
      });
      setEditingAgentType(agentType);
    }
  };

  const saveInstructions = (values: { name: string; description: string; instructions: string }) => {
    if (!editingAgentType) return;
    
    const updatedInstructions = agentInstructions.map(agent => 
      agent.type === editingAgentType 
        ? { ...agent, ...values }
        : agent
    );
    
    setAgentInstructions(updatedInstructions);
    setEditingAgentType(null);
    
    // Save to localStorage
    localStorage.setItem("agent_instructions", JSON.stringify(updatedInstructions));
    toast.success("Agent instructions updated successfully");
  };

  const cancelEditing = () => {
    setEditingAgentType(null);
    form.reset();
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
          {agentInstructions.map((agent) => (
            <TableRow 
              key={agent.type}
              className={`${agent.type === activeAgent ? "bg-gray-800/30" : ""}`}
            >
              <TableCell className="font-medium">{agent.type}</TableCell>
              <TableCell>
                {editingAgentType === agent.type ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(saveInstructions)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="bg-gray-900" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                ) : (
                  agent.name
                )}
              </TableCell>
              <TableCell>
                {editingAgentType === agent.type ? (
                  <Form {...form}>
                    <form className="space-y-4">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="bg-gray-900" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                ) : (
                  agent.description
                )}
              </TableCell>
              <TableCell>
                {editingAgentType === agent.type ? (
                  <Form {...form}>
                    <form className="space-y-4">
                      <FormField
                        control={form.control}
                        name="instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                className="bg-gray-900 min-h-[80px] text-sm"
                                rows={3} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                ) : (
                  <div className="text-sm max-w-md truncate">{agent.instructions}</div>
                )}
              </TableCell>
              <TableCell>
                {editingAgentType === agent.type ? (
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={form.handleSubmit(saveInstructions)}
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
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => startEditing(agent.type)}
                  >
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
