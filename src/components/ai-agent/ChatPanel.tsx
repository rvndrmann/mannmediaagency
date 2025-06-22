
import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Info, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { SimpleMessage } from "@/adapters/MessageTypeAdapter";
import { Message as GlobalMessage } from "@/types/message";
import { adaptMessageToSimple, adaptMessagesToSimple } from "@/adapters/MessageTypeAdapter";
import { convertToSimpleMessages, ensureGlobalMessages } from "@/utils/messageTypeAdapter";

interface ChatPanelProps {
  messages: GlobalMessage[] | SimpleMessage[];
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

  // Process messages to ensure they're in the right format
  const adaptedMessages: SimpleMessage[] = messages.length > 0 && "id" in (messages[0] || {}) 
    ? adaptMessagesToSimple(ensureGlobalMessages(messages as GlobalMessage[]))
    : convertToSimpleMessages(messages as any[]);

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

  // Check if there are any error messages
  const hasErrors = adaptedMessages.some(msg => msg.status === "error");

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
              <p>AI Agent: 0.07 credits per message</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {hasErrors && (
        <div className="absolute top-0 left-4 mt-2 z-10">
          <Badge variant="destructive" className="flex items-center gap-1 px-2 py-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Connection issues detected</span>
          </Badge>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea 
          ref={scrollAreaRef} 
          className={`h-full ${isMobile ? "min-h-[calc(100vh-16rem)]" : "min-h-[calc(100vh-16rem)]"}`}
        >
          <div className={`space-y-4 p-4 ${isMobile ? "pb-20" : "pb-16"}`}>
            {adaptedMessages.map((message, index) => (
              <ChatMessage key={message.id || index} message={message} />
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
          userRole="user"
        />
      </div>
    </div>
  );
};
