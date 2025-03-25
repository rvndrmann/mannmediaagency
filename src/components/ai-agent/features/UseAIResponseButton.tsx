
import { Button } from "@/components/ui/button";
import { PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Define a simplified message interface for this component
interface ComponentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

interface UseAIResponseButtonProps {
  onUseResponse: (response: string) => void;
  messages: ComponentMessage[];
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
        title: "Prompt Updated",
        description: "The last AI response has been copied to the prompt.",
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
    >
      <PenTool className="h-3.5 w-3.5 mr-1" />
      <span className="whitespace-nowrap text-xs">Use Last AI</span>
    </Button>
  );
};
