
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserCredits } from "@/hooks/use-user-credits";

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
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      const handleScroll = () => {
        const isBottom =
          chatContainer.scrollHeight - chatContainer.scrollTop <=
          chatContainer.clientHeight + 10; // Added small offset for better UX
        setIsScrolledToBottom(isBottom);
      };

      chatContainer.addEventListener("scroll", handleScroll);
      return () => chatContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    if (isScrolledToBottom) {
      // Scroll to bottom for both mobile and desktop
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isScrolledToBottom]);

  // Focus input when chat becomes visible on mobile
  useEffect(() => {
    if (isMobile && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isMobile]);

  // Update character count
  useEffect(() => {
    setCharCount(input.length);
  }, [input]);

  return (
    <div className="flex flex-col h-full bg-[#1A1F2C]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 text-center">
        <h2 className="text-lg font-semibold text-white">Chat</h2>
      </div>

      {/* Credits display */}
      <div className="absolute top-4 right-4 bg-purple-500/70 px-3 py-1 rounded-lg text-white text-sm z-10">
        Credits: {userCredits?.credits_remaining?.toFixed(2) || "0.00"}
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto bg-[#1A1F2C]">
        <ScrollArea ref={chatContainerRef} className="h-full px-4 py-2">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex max-w-[85%]",
                  message.role === "assistant" ? "self-start" : "self-end"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                    <AvatarImage
                      src="/ai-logo.png"
                      alt="AI"
                    />
                    <AvatarFallback className="bg-gray-700 text-white text-xs">AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "rounded-2xl p-3 break-words",
                    message.role === "assistant" 
                      ? "bg-gray-700 text-white" 
                      : "bg-purple-500 text-white ml-auto"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                    <AvatarImage
                      src="/user-avatar.png"
                      alt="User"
                    />
                    <AvatarFallback className="bg-purple-500 text-white text-xs">You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex self-start max-w-[85%]">
                <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                  <AvatarImage src="/ai-logo.png" alt="ai" />
                  <AvatarFallback className="bg-gray-700 text-white text-xs">AI</AvatarFallback>
                </Avatar>
                <div className="bg-gray-700 text-white rounded-2xl p-3">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input area */}
      <form onSubmit={onSubmit} className="ai-chat-form px-4 py-4 border-t border-white/10 bg-[#1A1F2C]">
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            className="bg-[#262938] border-white/10 text-white rounded-full pr-16 pl-4 h-14"
            maxLength={350}
          />
          <Button 
            type="submit" 
            disabled={isLoading} 
            size="icon" 
            className="absolute right-1 top-1 h-12 w-12 rounded-full bg-purple-500 hover:bg-purple-600"
          >
            <Send className="h-5 w-5 text-white" />
          </Button>
          <div className="text-xs text-gray-400 mt-1 text-right">
            {charCount}/350
          </div>
        </div>
      </form>
    </div>
  );
};
