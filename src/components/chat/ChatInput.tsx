
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
}

export const ChatInput = ({ 
  input, 
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
  showAttachmentButton = false
}: ChatInputProps) => {
  const MAX_WORDS = 350;

  const countWords = (text: string) => {
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

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {attachments.length > 0 && (
        <AttachmentPreview
          attachments={attachments}
          onRemove={onAttachmentRemove}
          isRemovable={true}
        />
      )}
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="min-h-[48px] max-h-[120px] bg-gradient-to-r from-[#262B38] to-[#2D3240] border-none text-white placeholder:text-white/50 resize-none rounded-3xl px-4 py-3 shadow-inner"
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
          type="submit" 
          disabled={isLoading || (input.trim() === '' && (!attachments || attachments.length === 0))}
          variant="gradient"
          size="icon"
          className="self-end rounded-full h-12 w-12 p-0 flex items-center justify-center"
        >
          <span>
            {isLoading ? (
              <Sparkles className="h-5 w-5 animate-pulse" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </span>
        </Button>
      </div>
    </form>
  );
};
