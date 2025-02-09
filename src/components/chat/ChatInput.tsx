
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChatInput = ({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) => {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Create script..."
        disabled={isLoading}
        className="flex-1 bg-[#333333] border-white/10 text-white placeholder:text-white/50"
      />
      <Button 
        type="submit" 
        disabled={isLoading}
        className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};
