
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgentType } from "@/hooks/use-multi-agent-chat";

const formSchema = z.object({
  instructions: z.string().min(1, "Instructions are required"),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAgentInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentType: AgentType;
  initialInstructions?: string;
  onSave: (agentType: AgentType, instructions: string) => void;
}

export function EditAgentInstructionsDialog({
  open,
  onOpenChange,
  agentType,
  initialInstructions = "",
  onSave,
}: EditAgentInstructionsDialogProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instructions: initialInstructions,
    },
  });

  const handleSave = async (data: FormValues) => {
    setSaving(true);
    try {
      onSave(agentType, data.instructions);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving instructions:", error);
    } finally {
      setSaving(false);
    }
  };

  // Reset form when dialog opens with current values
  const resetForm = () => {
    form.reset({
      instructions: initialInstructions || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isOpen) {
        resetForm();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px] bg-[#1A1F29] text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-sm">Edit {agentType.toUpperCase()} Agent Instructions</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Custom Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter custom instructions for this agent..."
                      className="h-48 border-white/20 bg-[#21283B] resize-none text-xs"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-white/20 hover:bg-white/10 text-xs h-7"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-xs h-7"
              >
                {saving ? "Saving..." : "Save Instructions"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
