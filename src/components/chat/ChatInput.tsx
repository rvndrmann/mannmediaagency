
import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, PaperclipIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  showAttachmentButton?: boolean;
  onAttachmentClick?: () => void;
  placeholderText?: string;
  useAssistantsApi?: boolean;
  setUseAssistantsApi?: (value: boolean) => void;
  useMcp?: boolean;
  setUseMcp?: (value: boolean) => void;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isLoading = false,
  autoFocus = true,
  showAttachmentButton = false,
  onAttachmentClick,
  placeholderText = "Type a message...",
  useAssistantsApi,
  setUseAssistantsApi,
  useMcp,
  setUseMcp,
}: ChatInputProps) {
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
    onInputChange(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || !isLoading) {
      onSubmit(e);
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
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          disabled={isLoading}
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
          >
            <PaperclipIcon className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
        )}
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className={`absolute bottom-1 right-1 h-8 w-8 p-0 ${
            !input.trim() || isLoading
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
