import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentInfo, AgentIconType } from "@/types/message";
import { CustomAgentFormData } from "@/hooks/use-custom-agents";

const formSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(10).max(1000),
  icon: z.string(),
  color: z.string(),
  instructions: z.string().min(10)
});

const AGENT_ICONS: Record<string, AgentIconType> = {
  Bot: "Bot",
  PenLine: "PenLine",
  Image: "Image",
  Wrench: "Wrench", 
  Zap: "Zap",
  Brain: "Brain",
  Lightbulb: "Lightbulb",
  Music: "Music",
  Video: "Video",
  Globe: "Globe",
  ShoppingBag: "ShoppingBag"
};

const COLOR_OPTIONS = [
  { value: "from-blue-400 to-indigo-500", label: "Blue" },
  { value: "from-green-400 to-teal-500", label: "Green" },
  { value: "from-purple-400 to-fuchsia-500", label: "Purple" },
  { value: "from-pink-400 to-rose-500", label: "Pink" },
  { value: "from-amber-400 to-orange-500", label: "Orange" },
  { value: "from-red-400 to-rose-500", label: "Red" },
  { value: "from-cyan-400 to-blue-500", label: "Cyan" },
  { value: "from-emerald-400 to-green-500", label: "Emerald" }
];

export interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: CustomAgentFormData) => Promise<void>;
  isSubmitting: boolean;
}

export const AddAgentDialog = ({ open, onOpenChange, onSubmit, isSubmitting }: AddAgentDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "Bot",
      color: "from-blue-400 to-indigo-500",
      instructions: ""
    },
  });

  const submitHandler = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Agent</DialogTitle>
          <DialogDescription>
            Create a new AI agent to assist in your collaboration.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submitHandler)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Agent Name" {...field} />
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
                    <Textarea
                      placeholder="A brief description of the agent"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {Object.entries(AGENT_ICONS).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectGroup>
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
                  <FormItem className="w-1/2">
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {COLOR_OPTIONS.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              {color.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
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
                      placeholder="Instructions for the agent"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
