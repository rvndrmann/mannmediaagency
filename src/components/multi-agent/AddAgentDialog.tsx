
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
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AgentIconType, AgentInfo } from "@/types/message";
import { CustomAgentFormData } from "@/hooks/use-custom-agents";

// Available icon options
const iconOptions = [
  { value: "Bot", label: "Robot" },
  { value: "PenLine", label: "Pen" },
  { value: "Image", label: "Image" },
  { value: "Wrench", label: "Tool" },
  { value: "Code", label: "Code" },
  { value: "FileText", label: "Document" },
  { value: "Zap", label: "Lightning" },
  { value: "Brain", label: "Brain" },
  { value: "Lightbulb", label: "Idea" },
  { value: "Music", label: "Music" },
  { value: "Video", label: "Video" },
  { value: "Globe", label: "Globe" },
  { value: "ShoppingBag", label: "Shopping" }
];

// Available color options
const colorOptions = [
  { value: "from-blue-400 to-indigo-500", label: "Blue" },
  { value: "from-purple-400 to-pink-500", label: "Purple" },
  { value: "from-green-400 to-teal-500", label: "Green" },
  { value: "from-amber-400 to-orange-500", label: "Orange" },
  { value: "from-red-400 to-rose-500", label: "Red" },
  { value: "from-cyan-400 to-blue-500", label: "Cyan" }
];

// Validation schema for the form
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  description: z.string().min(5, "Description must be at least 5 characters").max(150, "Description must be less than 150 characters"),
  icon: z.enum(["Bot", "PenLine", "Image", "Wrench", "Code", "FileText", "Zap", "Brain", "Lightbulb", "Music", "Video", "Globe", "ShoppingBag"] as const),
  color: z.string().min(1, "Please select a color"),
  instructions: z.string().min(10, "Instructions must be at least 10 characters").max(1000, "Instructions must be less than 1000 characters")
});

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomAgentFormData) => void;
  editAgent?: AgentInfo | null;
  title?: string;
}

export function AddAgentDialog({
  open,
  onOpenChange,
  onSubmit,
  editAgent = null,
  title = "Add Custom Agent"
}: AddAgentDialogProps) {
  // Initialize form with default values or edit agent values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editAgent ? {
      name: editAgent.name,
      description: editAgent.description,
      icon: editAgent.icon,
      color: editAgent.color,
      instructions: editAgent.instructions
    } : {
      name: "",
      description: "",
      icon: "Bot",
      color: "from-blue-400 to-indigo-500",
      instructions: ""
    }
  });

  // Handle form submission
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as CustomAgentFormData);
    if (!editAgent) {
      form.reset(); // Only reset if creating a new agent, not editing
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {editAgent 
              ? "Edit your custom agent's details and instructions." 
              : "Create a new agent with custom instructions and capabilities."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SEO Expert" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Specialized in SEO optimization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Theme</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colorOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed instructions for how the agent should behave and respond..." 
                      className="min-h-[150px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" className="w-full">
                {editAgent ? "Save Changes" : "Create Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
