
import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PencilIcon, TrashIcon, PlusIcon } from 'lucide-react';

interface Instruction {
  id: string;
  name: string;
  agent_type: string;
  instructions: string;
  user_id: string;
  created_at: string;
}

export const AgentInstructionsTable = () => {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState<Instruction | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedInstructions, setEditedInstructions] = useState("");

  // Fetch instructions
  const fetchInstructions = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get conversations from agent_instructions table (custom created)
      // For this stub, we'll use a mock implementation that doesn't require the table to exist
      const mockInstructions: Instruction[] = [
        {
          id: "1",
          name: "Creative Writer",
          agent_type: "creative",
          instructions: "You are a creative writer who specializes in storytelling.",
          user_id: user.id,
          created_at: new Date().toISOString()
        },
        {
          id: "2", 
          name: "Technical Expert",
          agent_type: "technical",
          instructions: "You are a technical expert who specializes in explaining complex topics.",
          user_id: user.id,
          created_at: new Date().toISOString()
        }
      ];
      
      setInstructions(mockInstructions);
    } catch (error) {
      console.error("Error fetching instructions:", error);
      toast.error("Failed to load agent instructions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructions();
  }, []);

  // Edit instruction
  const handleEdit = (instruction: Instruction) => {
    setSelectedInstruction(instruction);
    setEditedName(instruction.name);
    setEditedInstructions(instruction.instructions);
    setEditDialogOpen(true);
  };

  // Delete instruction
  const handleDelete = async (id: string) => {
    try {
      // In a real implementation, this would delete from the database
      // For the stub, we'll just update the local state
      setInstructions(prev => prev.filter(instruction => instruction.id !== id));
      toast.success("Agent instructions deleted");
    } catch (error) {
      console.error("Error deleting instruction:", error);
      toast.error("Failed to delete agent instructions");
    }
  };

  // Save edited instruction
  const handleSaveEdit = async () => {
    if (!selectedInstruction) return;
    
    try {
      // Update
      const updatedInstructions = instructions.map(instruction => 
        instruction.id === selectedInstruction.id 
          ? { 
              ...instruction, 
              name: editedName, 
              instructions: editedInstructions 
            } 
          : instruction
      );
      
      setInstructions(updatedInstructions);
      setEditDialogOpen(false);
      toast.success("Agent instructions updated");
    } catch (error) {
      console.error("Error updating instruction:", error);
      toast.error("Failed to update agent instructions");
    }
  };

  // Create new instruction
  const handleCreateNew = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // For the stub, we'll just update the local state
      const newInstruction: Instruction = {
        id: Math.random().toString(36).substring(2, 9),
        name: editedName,
        agent_type: editedName.toLowerCase().replace(/\s+/g, '-'),
        instructions: editedInstructions,
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      setInstructions(prev => [newInstruction, ...prev]);
      setCreateDialogOpen(false);
      setEditedName("");
      setEditedInstructions("");
      toast.success("New agent instructions created");
    } catch (error) {
      console.error("Error creating instruction:", error);
      toast.error("Failed to create agent instructions");
    }
  };

  // Open create dialog
  const handleOpenCreateDialog = () => {
    setEditedName("");
    setEditedInstructions("");
    setCreateDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Agent Instructions</CardTitle>
          <CardDescription>
            Customize instructions for different agent types
          </CardDescription>
        </div>
        <Button onClick={handleOpenCreateDialog} className="bg-blue-500">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading agent instructions...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Instructions Preview</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {instructions.map((instruction) => (
                  <tr key={instruction.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{instruction.name}</td>
                    <td className="px-4 py-2">{instruction.agent_type}</td>
                    <td className="px-4 py-2 truncate max-w-xs">
                      {instruction.instructions.substring(0, 100)}
                      {instruction.instructions.length > 100 ? '...' : ''}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => handleEdit(instruction)} 
                          variant="outline" 
                          size="sm"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(instruction.id)} 
                          variant="outline" 
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Agent Instructions</DialogTitle>
            <DialogDescription>
              Update the name and instructions for this agent.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Agent name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="instructions" className="text-sm font-medium">
                Instructions
              </label>
              <Textarea
                id="instructions"
                value={editedInstructions}
                onChange={(e) => setEditedInstructions(e.target.value)}
                placeholder="Enter detailed instructions for the agent..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Define a new agent with custom instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="new-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="new-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Agent name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="new-instructions" className="text-sm font-medium">
                Instructions
              </label>
              <Textarea
                id="new-instructions"
                value={editedInstructions}
                onChange={(e) => setEditedInstructions(e.target.value)}
                placeholder="Enter detailed instructions for the agent..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNew}>
              Create Agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
