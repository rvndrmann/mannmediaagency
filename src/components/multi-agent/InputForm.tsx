
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X } from 'lucide-react';
import { Attachment } from '@/types/message';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Reset height to calculate new height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(120, textareaRef.current.scrollHeight)}px`;
    }
  };
  
  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };
  
  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFileUpload(Array.from(e.target.files));
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-slate-700">
      {/* Attachment Preview */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pendingAttachments.map(attachment => (
            <div key={attachment.id} className="relative group">
              {attachment.type === 'image' ? (
                <>
                  <img 
                    src={attachment.url} 
                    alt={attachment.name}
                    className="w-16 h-16 object-cover rounded-md border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <div className="flex items-center p-2 bg-slate-800 rounded">
                  <Paperclip size={16} className="mr-2" />
                  <span className="text-sm">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="ml-2 text-red-400 hover:text-red-300"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <Button 
          type="button"
          variant="ghost" 
          size="icon"
          onClick={handleFileSelect}
          disabled={isLoading}
          className="text-slate-400 hover:text-white"
        >
          <Paperclip size={20} />
        </Button>
        
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-slate-800 border-slate-700"
        />
        
        <Button 
          type="submit"
          disabled={isLoading || (!input.trim() && pendingAttachments.length === 0) || !hasEnoughCredits}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </Button>
      </div>
      
      {!hasEnoughCredits && (
        <p className="mt-2 text-xs text-red-400">
          You need at least 0.07 credits to send a message. Please purchase more credits.
        </p>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        multiple
      />
    </form>
  );
};
