
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
    <form onSubmit={onSubmit} className="space-y-0">
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="min-h-[80px] md:min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/50 resize-none focus:ring-2 focus:ring-[#9b87f5] focus:border-transparent pr-4"
            />
            <div className="absolute bottom-2 left-3 right-3">
              <div className="flex justify-between items-center">
                <span className={`text-xs ${currentWords >= MAX_WORDS ? 'text-red-500' : 'text-gray-400'}`}>
                  {currentWords}/{MAX_WORDS}
                </span>
                <Progress value={progress} className="w-1/3 h-1" />
              </div>
            </div>
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white self-start px-4 h-12 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
};
