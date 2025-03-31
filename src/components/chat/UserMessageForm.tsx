
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X } from "lucide-react";
import { Attachment } from "@/types/message";

interface UserMessageFormProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e?: React.FormEvent) => Promise<void>;
  onFileUpload?: (files: File[]) => void;
  isLoading?: boolean;
  attachments?: Attachment[];
  onRemoveAttachment?: (id: string) => void;
  placeholder?: string;
  showSendButton?: boolean;
}

export function UserMessageForm({
  message,
  setMessage,
  onSubmit,
  onFileUpload,
  isLoading = false,
  attachments = [],
  onRemoveAttachment,
  placeholder = "Type a message...",
  showSendButton = true,
}: UserMessageFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFileUpload) {
      onFileUpload(Array.from(e.target.files));
      e.target.value = ""; // Reset the input
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }} className="relative">
      {/* Attachments display */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/50 rounded-md">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center bg-muted rounded-md p-1 pr-2 text-xs">
              <span className="truncate max-w-[150px]">{attachment.name}</span>
              {onRemoveAttachment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1"
                  onClick={() => onRemoveAttachment(attachment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <Textarea
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="resize-none min-h-[80px] px-4 py-3 rounded-lg"
          disabled={isLoading}
        />
        
        <div className="flex flex-col gap-2">
          {onFileUpload && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </>
          )}
          
          {showSendButton && (
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-10 w-10"
              disabled={isLoading || (!message.trim() && attachments.length === 0)}
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
