
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
        title: "Prompt Updated",
        description: "The last AI response has been copied to the prompt.",
      });
    }
  };

  return (
    <Button 
      onClick={handleClick}
      variant="default"
      size={variant === "compact" ? "sm" : "default"}
      className={cn(
        "bg-purple-600 hover:bg-purple-700 text-white transition-colors",
        variant === "compact" && "px-2 h-8",
        className
      )}
    >
      <PenTool className="h-4 w-4 mr-2" />
      {variant === "default" ? "Use Last AI Response" : "Use Last AI Response"}
    </Button>
  );
};
