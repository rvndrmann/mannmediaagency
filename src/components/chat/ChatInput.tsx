
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, SendHorizontal } from "lucide-react";
import React, { useEffect, useRef } from "react";

interface ChatInputProps {
  input: string;
  isLoading?: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  useAssistantsApi?: boolean;
  setUseAssistantsApi?: (value: boolean) => void;
  useMcp?: boolean;
  setUseMcp?: (value: boolean) => void;
}

export function ChatInput({ 
  input, 
  isLoading = false, 
  onInputChange, 
  onSubmit,
  placeholder = "Type your message here...",
  useAssistantsApi = false,
  setUseAssistantsApi = () => {},
  useMcp = false,
  setUseMcp = () => {}
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
  };

  // Handle pressing Enter (submit form) vs Shift+Enter (new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[60px] resize-none flex-1"
        disabled={isLoading}
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={isLoading || !input.trim()}
        className="h-[60px] w-[60px] rounded-md"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <SendHorizontal className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
