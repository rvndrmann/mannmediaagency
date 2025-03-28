
import { useState } from "react";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditAgentInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentType: AgentType;
  initialInstructions: string;
  onSave: (agentType: AgentType, instructions: string) => void;
}

export function EditAgentInstructionsDialog({
  open,
  onOpenChange,
  agentType,
  initialInstructions,
  onSave
}: EditAgentInstructionsDialogProps) {
  const [instructions, setInstructions] = useState(initialInstructions);
  
  const getAgentName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      default: return "Assistant";
    }
  };
  
  const handleSave = () => {
    onSave(agentType, instructions);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {getAgentName(agentType)} Instructions</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter instructions for this agent..."
            className="min-h-[200px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Instructions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
