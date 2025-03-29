
import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, PaperclipIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface ChatInputProps {
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  showAttachmentButton?: boolean;
  onAttachmentClick?: () => void;
  input?: string;
  onInputChange?: (value: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  useAssistantsApi?: boolean;
  setUseAssistantsApi?: (value: boolean) => void;
  useMcp?: boolean;
  setUseMcp?: (value: boolean) => void;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = "Type a message...",
  showAttachmentButton = false,
  onAttachmentClick,
  input = "",
  onInputChange,
  isLoading = false,
  autoFocus = true,
  useAssistantsApi,
  setUseAssistantsApi,
  useMcp,
  setUseMcp,
}: ChatInputProps) {
  const [localInput, setLocalInput] = useState(input);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to resize textarea based on content
  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalInput(value);
    if (onInputChange) {
      onInputChange(value);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localInput.trim() || !isLoading) {
      onSubmit(e);
      if (!onInputChange) {
        // Only clear local input if not controlled externally
        setLocalInput("");
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto resize on input change
  useEffect(() => {
    autoResizeTextarea();
  }, [localInput]);

  // Update local input when controlled input changes
  useEffect(() => {
    if (onInputChange) {
      setLocalInput(input);
    }
  }, [input, onInputChange]);

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          value={localInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          autoFocus={autoFocus}
          className="min-h-[40px] w-full resize-none rounded-md border bg-background p-2 pr-12 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
          rows={1}
        />
        {showAttachmentButton && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute bottom-1 right-12 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={onAttachmentClick}
            disabled={disabled || isLoading}
          >
            <PaperclipIcon className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
        )}
        <Button
          type="submit"
          size="icon"
          disabled={!localInput.trim() || disabled || isLoading}
          className={`absolute bottom-1 right-1 h-8 w-8 p-0 ${
            !localInput.trim() || disabled || isLoading
              ? "opacity-50"
              : "text-primary hover:bg-primary/10"
          }`}
        >
          <SendHorizontal className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}
