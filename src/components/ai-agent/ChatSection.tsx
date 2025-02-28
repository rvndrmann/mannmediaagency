import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserCredits } from "@/hooks/use-user-credits";
import { toast } from "sonner";

interface ChatSectionProps {
  messages: { role: "user" | "assistant"; content: string }[];
  input: string;
  isLoading: boolean;
  userCredits: any;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isMobile: boolean;
}

export function ChatSection({
  messages,
  input,
  isLoading,
  userCredits,
  onInputChange,
  onSubmit,
  isMobile,
}: ChatSectionProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      const handleScroll = () => {
        const isBottom =
          chatContainer.scrollHeight - chatContainer.scrollTop ===
          chatContainer.clientHeight;
        setIsScrolledToBottom(isBottom);
      };

      chatContainer.addEventListener("scroll", handleScroll);
      return () => chatContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    if (!isMobile && isScrolledToBottom) {
      // Scroll to bottom only on desktop
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isMobile, isScrolledToBottom]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        <ScrollArea ref={chatContainerRef} className="h-full">
          <div className="flex flex-col gap-4 p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 text-sm",
                  message.role === "assistant" && "text-gray-50"
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={
                      message.role === "assistant"
                        ? "/ai-logo.png"
                        : "/user-avatar.png"
                    }
                    alt={message.role}
                  />
                  <AvatarFallback>{message.role.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 whitespace-pre-line">{message.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2 text-sm text-gray-50">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="/ai-logo.png" alt="ai" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div>Thinking...</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <form onSubmit={onSubmit} className="ai-chat-form">
        <div className="border-t border-white/10 p-4 flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            className="bg-[#202431] border-white/20 text-white"
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
