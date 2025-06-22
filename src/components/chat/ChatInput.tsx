import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  userRole: 'user' | 'assistant';
}

export const ChatInput = ({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  userRole
}: ChatInputProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Textarea
        placeholder={`Ask as ${userRole}...`}
        className="flex-1 min-h-[60px] max-h-[120px] resize-none border rounded-md focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !input.trim()}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};
