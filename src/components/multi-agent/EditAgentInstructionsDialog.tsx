
import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AgentType } from "@/hooks/use-multi-agent-chat";

// Validation schema for the form
const formSchema = z.object({
  instructions: z.string()
    .min(10, "Instructions must be at least 10 characters")
    .max(2000, "Instructions must be less than 2000 characters")
});

interface EditAgentInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { instructions: string }) => void;
  agentType: AgentType;
  currentInstructions: string;
  title?: string;
}

export function EditAgentInstructionsDialog({
  open,
  onOpenChange,
  onSubmit,
  agentType,
  currentInstructions,
  title = "Edit Agent Instructions"
}: EditAgentInstructionsDialogProps) {
  // Initialize form with current instructions
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instructions: currentInstructions || "" // Ensure instructions is never undefined
    }
  });

  // Handle form submission
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  React.useEffect(() => {
    if (open) {
      // Reset form with current instructions when dialog opens
      // Make sure instructions is always a string
      form.reset({ 
        instructions: currentInstructions || "" 
      });
    }
  }, [open, currentInstructions, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Customize how this agent behaves by editing its instructions. 
            These instructions guide the agent's responses and capabilities.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter detailed instructions for how the agent should behave and respond..." 
                      className="min-h-[250px] font-mono text-sm"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" className="w-full">
                Save Instructions
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
