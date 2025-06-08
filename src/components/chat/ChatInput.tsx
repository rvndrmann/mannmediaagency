
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Send, Paperclip, Sparkles } from "lucide-react";
import { AISettingsDialog } from "@/components/ui/ai-settings-dialog";
import { FileAttachmentButton } from "@/components/multi-agent/FileAttachmentButton";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";
import { Attachment } from "@/types/message";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  useAssistantsApi?: boolean;
  setUseAssistantsApi?: (value: boolean) => void;
  useMcp?: boolean;
  setUseMcp?: (value: boolean) => void;
  attachments?: Attachment[];
  onAttachmentAdd?: (attachments: Attachment[]) => void;
  onAttachmentRemove?: (id: string) => void;
  showAttachmentButton?: boolean;
  userRole?: 'user' | 'admin';
}

export const ChatInput = ({
  input = '',
  isLoading,
  onInputChange,
  onSubmit,
  useAssistantsApi = false,
  setUseAssistantsApi = () => {},
  useMcp = false,
  setUseMcp = () => {},
  attachments = [],
  onAttachmentAdd,
  onAttachmentRemove,
  showAttachmentButton = false,
  userRole = 'user',
}: ChatInputProps) => {
  const MAX_WORDS = 350;

  const countWords = (text: string | undefined) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const currentWords = countWords(input);
  const progress = (currentWords / MAX_WORDS) * 100;
  const isWordLimitExceeded = currentWords >= MAX_WORDS;

  const handleChange = (value: string) => {
    const words = countWords(value);
    if (words <= MAX_WORDS) {
      onInputChange(value);
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && ((input && input.trim() !== '') || (attachments && attachments.length > 0))) {
        onSubmit(e as any);
      }
    }
  };

  const handleSubmitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!isLoading && ((input && input.trim() !== '') || (attachments && attachments.length > 0))) {
      onSubmit(e as any);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!isLoading && ((input && input.trim() !== '') || (attachments && attachments.length > 0))) {
        onSubmit(e);
      }
    }} className="space-y-1 w-full">
      {attachments.length > 0 && (
        <AttachmentPreview
          attachments={attachments}
          onRemove={onAttachmentRemove}
          isRemovable={true}
        />
      )}
      
      <div className="flex gap-2 items-end w-full">
        <div className="flex-1 relative">
          <Textarea
            value={input || ''}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleInputKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="min-h-[40px] max-h-[100px] bg-white border border-gray-200 text-gray-900 placeholder:text-gray-500 resize-none rounded-2xl px-3 py-2 shadow-sm"
          />
          <div className="absolute bottom-1 left-3 right-10">
            <div className="flex justify-between items-center">
              <span className={`text-xs ${isWordLimitExceeded ? 'text-red-500' : 'text-gray-400'}`}>
                {currentWords}/{MAX_WORDS}
              </span>
              <div className="flex-1 mx-2">
                <Progress 
                  value={progress} 
                  className="h-1" 
                  indicatorClassName={isWordLimitExceeded ? "bg-red-500" : undefined}
                />
              </div>
            </div>
          </div>
        </div>
        
        {showAttachmentButton && onAttachmentAdd && (
          <FileAttachmentButton onAttach={onAttachmentAdd} />
        )}
        
        <Button 
          type="button" 
          onClick={handleSubmitClick}
          disabled={isLoading || !input || input.trim() === '' && (!attachments || attachments.length === 0)}
          variant="default"
          size="icon"
          className="rounded-full h-10 w-10 p-0 flex items-center justify-center bg-green-600 hover:bg-green-700"
        >
          <span>
            {isLoading ? (
              <Sparkles className="h-4 w-4 animate-pulse" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </span>
        </Button>
      </div>
    </form>
  );
};
