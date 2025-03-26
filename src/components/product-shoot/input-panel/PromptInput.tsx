
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseAIResponseButton } from "@/components/ai-agent/features/UseAIResponseButton";
import { Message } from "@/types/message";
import { ensureGlobalMessages } from "@/utils/messageTypeAdapter";

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  messages: Message[] | any[];
}

export const PromptInput = ({
  prompt,
  onPromptChange,
  messages
}: PromptInputProps) => {
  // Ensure messages are properly formatted
  const formattedMessages = ensureGlobalMessages(messages);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="prompt" className="text-white">Prompt</Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Textarea
            id="prompt"
            placeholder="Describe your product shot..."
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-[100px] bg-gray-900 border-gray-700 text-white resize-none"
          />
        </div>
        <UseAIResponseButton
          messages={formattedMessages}
          onUseResponse={onPromptChange}
          variant="compact"
          className="shrink-0"
        />
      </div>
    </div>
  );
};
