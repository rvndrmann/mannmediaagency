import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CustomAgentFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
  instructions: string;
}

export interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: CustomAgentFormData) => Promise<void>;
  isSubmitting?: boolean; // Make isSubmitting optional
}

export function AddAgentDialog({ open, onOpenChange, onSubmit, isSubmitting = false }: AddAgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("from-blue-400 to-indigo-500");
  const [icon, setIcon] = useState("Bot");
  const [instructions, setInstructions] = useState("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instructions.trim()) return;
    
    // Ensure all fields are provided
    const formData: CustomAgentFormData = {
      name: name.trim(),
      description: description.trim() || `A custom agent named ${name}`,
      color,
      icon,
      instructions: instructions.trim()
    };
    
    await onSubmit(formData);
    resetForm();
  };
  
  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("from-blue-400 to-indigo-500");
    setIcon("Bot");
    setInstructions("");
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Agent</DialogTitle>
          <DialogDescription>
            Create a new agent to use in your multi-agent chats.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Agent Name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Agent Description"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="from-blue-400 to-indigo-500">Blue to Indigo</SelectItem>
                <SelectItem value="from-green-400 to-emerald-500">Green to Emerald</SelectItem>
                <SelectItem value="from-red-400 to-orange-500">Red to Orange</SelectItem>
                <SelectItem value="from-purple-400 to-pink-500">Purple to Pink</SelectItem>
                <SelectItem value="from-yellow-400 to-amber-500">Yellow to Amber</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-right">
              Icon
            </Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bot">Bot</SelectItem>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Settings">Settings</SelectItem>
                <SelectItem value="Code">Code</SelectItem>
                <SelectItem value="MessageCircle">MessageCircle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="instructions" className="text-right mt-2">
              Instructions
            </Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="col-span-3"
              placeholder="Agent Instructions"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              "Add Agent"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
