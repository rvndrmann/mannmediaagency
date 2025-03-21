
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AgentType } from "@/hooks/use-multi-agent-chat";

export interface EditAgentInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentType: AgentType;
  initialInstructions: string;
  onSave: (agentType: AgentType, instructions: string) => void;
}

export const EditAgentInstructionsDialog = ({
  open,
  onOpenChange,
  agentType,
  initialInstructions,
  onSave
}: EditAgentInstructionsDialogProps) => {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (instructions.trim() === '') {
      toast({
        title: "Instructions cannot be empty",
        description: "Please enter instructions for the agent.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      onSave(agentType, instructions);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to save instructions",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Agent Instructions</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter agent instructions..."
            className="min-h-[200px] resize-y"
          />
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Instructions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
