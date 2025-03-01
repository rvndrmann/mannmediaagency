
import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  userCredits: { credits_remaining: number } | null;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isMobile?: boolean;
  isVisible?: boolean;
}

export const ChatPanel = ({
  messages,
  input,
  isLoading,
  userCredits,
  onInputChange,
  onSubmit,
  isMobile = false,
  isVisible = true
}: ChatPanelProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (lastMessageRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTop = scrollHeight;
      }
    }
  };

  // Scroll to bottom when messages change or when the chat becomes visible
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Force scroll to bottom when the component becomes visible
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-0 right-0 p-2 bg-white/5 backdrop-blur-lg rounded-bl-lg z-10 flex items-center space-x-2">
        <span className="text-sm text-white/80">
          Credits: {userCredits?.credits_remaining.toFixed(2) || 0}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Info className="h-3.5 w-3.5 text-blue-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 border-gray-700 text-white">
              <p>AI Agent: 1 credit per 1000 words</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea 
          ref={scrollAreaRef} 
          className={`h-full ${isMobile ? "min-h-[calc(100vh-16rem)]" : "min-h-[calc(100vh-16rem)]"}`}
        >
          <div className={`space-y-4 p-4 ${isMobile ? "pb-20" : "pb-16"}`}>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={lastMessageRef} className="h-px" />
          </div>
        </ScrollArea>
      </div>

      <div className={`sticky bottom-0 left-0 right-0 w-full bg-[#1A1F2C]/95 backdrop-blur-xl border-t border-white/10 p-4 ${isMobile ? "z-60 mb-12" : "z-10"}`}>
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
