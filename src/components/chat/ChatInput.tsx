
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Send } from "lucide-react";
import { AISettingsDialog } from "@/components/ui/ai-settings-dialog";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  useAssistantsApi?: boolean;
  setUseAssistantsApi?: (value: boolean) => void;
  useMcp?: boolean;
  setUseMcp?: (value: boolean) => void;
}

export const ChatInput = ({ 
  input, 
  isLoading, 
  onInputChange, 
  onSubmit,
  useAssistantsApi = false,
  setUseAssistantsApi = () => {},
  useMcp = false,
  setUseMcp = () => {}
}: ChatInputProps) => {
  const MAX_WORDS = 350;

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const currentWords = countWords(input);
  const progress = (currentWords / MAX_WORDS) * 100;

  const handleChange = (value: string) => {
    const words = countWords(value);
    if (words <= MAX_WORDS) {
      onInputChange(value);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="min-h-[48px] max-h-[120px] bg-[#262B38] border-none text-white placeholder:text-white/50 resize-none rounded-3xl px-4 py-3"
          />
          <div className="absolute bottom-1 left-3 right-10">
            <div className="flex justify-between items-center">
              <span className={`text-xs ${currentWords >= MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
                {currentWords}/{MAX_WORDS}
              </span>
              <div className="flex-1 mx-2">
                <Progress value={progress} className="h-1" />
              </div>
            </div>
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-[#9b87f5] hover:bg-[#8a77e1] text-white self-end rounded-full h-10 w-10 p-0 flex items-center justify-center"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
};
