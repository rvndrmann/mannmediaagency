
import React, { useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  useAssistantsApi?: boolean;
  setUseAssistantsApi?: (value: boolean) => void;
  useMcp?: boolean;
  setUseMcp?: (value: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  useAssistantsApi = false,
  setUseAssistantsApi = () => {},
  useMcp = false,
  setUseMcp = () => {},
  placeholder = "Type a message...",
  disabled = false
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          className={cn(
            "px-4 py-3 resize-none min-h-[52px] max-h-[200px] overflow-y-auto",
            "focus-visible:ring-offset-0 focus-visible:ring-0",
            "border-0 shadow-none",
            "bg-[#262B38] placeholder-gray-400 text-white",
            "rounded-lg"
          )}
        />

        <div className="absolute bottom-3 right-3 flex space-x-2">
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isLoading || !input.trim()}
            className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
