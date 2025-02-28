
import { Button } from "@/components/ui/button";
import { PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UseAIResponseButtonProps {
  onUseResponse: (response: string) => void;
  messages: Message[];
  className?: string;
  variant?: "default" | "compact";
}

export const UseAIResponseButton = ({ 
  onUseResponse, 
  messages,
  className,
  variant = "default"
}: UseAIResponseButtonProps) => {
  const { toast } = useToast();

  const getLastAIResponse = () => {
    if (!messages || messages.length === 0) {
      toast({
        title: "No AI Response Found",
        description: "There are no AI responses in the chat history.",
        variant: "destructive",
      });
      return null;
    }

    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");

    if (!lastAssistantMessage) {
      toast({
        title: "No AI Response Found",
        description: "There are no AI responses in the chat history.",
        variant: "destructive",
      });
      return null;
    }

    return lastAssistantMessage.content;
  };

  const handleClick = () => {
    const lastResponse = getLastAIResponse();
    if (lastResponse) {
      onUseResponse(lastResponse);
      toast({
        title: "AI Response Used",
        description: "The last AI response has been used successfully.",
      });
    }
  };

  return (
    <Button 
      onClick={handleClick}
      variant="default"
      size="sm"
      className={cn(
        "bg-purple-600 hover:bg-purple-700 text-white transition-colors",
        variant === "compact" && "h-7 px-2 text-xs py-0 min-w-0",
        className
      )}
      type="button"
    >
      <PenTool className="h-3.5 w-3.5 mr-1" />
      <span className="whitespace-nowrap text-xs">Use Last AI</span>
    </Button>
  );
};
