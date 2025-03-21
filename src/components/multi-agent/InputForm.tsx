
import React, { useState, useRef } from 'react';
import { SendHorizontal, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Attachment } from '@/types/message';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface InputFormProps {
  input: string;
  setInput: (input: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  pendingAttachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
  onFileUpload: (files: File[]) => void;
  hasEnoughCredits: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading,
  pendingAttachments,
  onRemoveAttachment,
  onFileUpload,
  hasEnoughCredits
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Setup file dropzone
  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: onFileUpload,
    noClick: true,
    noKeyboard: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    }
  });
  
  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  return (
    <div className="border-t border-slate-800 p-3 bg-slate-900/95 backdrop-blur-sm">
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingAttachments.map(attachment => (
            <div 
              key={attachment.id}
              className="relative bg-slate-800 rounded-md p-1 pl-2 pr-6 flex items-center"
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <span className="text-xs text-slate-300 truncate max-w-[120px]">
                {attachment.name}
              </span>
              <button 
                className="absolute right-1 top-1 text-slate-400 hover:text-white"
                onClick={() => onRemoveAttachment(attachment.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={onSubmit} className="relative">
        <div
          {...getRootProps()}
          className={cn(
            "relative flex items-center rounded-lg border bg-slate-950",
            isFocused 
              ? "border-blue-500/50 ring-1 ring-blue-500/20" 
              : "border-slate-800",
            !hasEnoughCredits && "opacity-60"
          )}
        >
          <input {...getInputProps()} />
          
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={hasEnoughCredits ? "Type your message..." : "Insufficient credits..."}
            disabled={isLoading || !hasEnoughCredits}
            rows={1}
            className="flex-1 py-3 pl-4 pr-14 bg-transparent text-white placeholder:text-slate-500 resize-none max-h-[200px] focus:outline-none"
          />
          
          <div className="absolute right-2 bottom-2 flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={open}
              disabled={isLoading || !hasEnoughCredits}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim() || !hasEnoughCredits}
              className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <SendHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </form>
      
      {!hasEnoughCredits && (
        <div className="mt-2 text-xs text-center text-red-400">
          You need at least 0.07 credits to send a message.
        </div>
      )}
    </div>
  );
};
