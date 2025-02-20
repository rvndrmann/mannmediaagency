
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChatInput = ({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) => {
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
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Create script..."
            disabled={isLoading}
            className="min-h-[100px] bg-[#333333] border-white/10 text-white placeholder:text-white/50 resize-none"
          />
          <div className="flex justify-between items-center">
            <span className={`text-sm ${currentWords >= MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
              {currentWords}/{MAX_WORDS} words
            </span>
            <Progress value={progress} className="w-1/2" />
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white self-start"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};
