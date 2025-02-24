
import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";

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
}

export const ChatPanel = ({
  messages,
  input,
  isLoading,
  userCredits,
  onInputChange,
  onSubmit
}: ChatPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-0 right-0 p-2 bg-white/5 backdrop-blur-lg rounded-bl-lg z-10">
        <span className="text-sm text-white/80">
          Credits: {userCredits?.credits_remaining.toFixed(2) || 0}
        </span>
      </div>
      <ScrollArea className="flex-1 pr-4 mb-4">
        <div className="space-y-4 pb-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="sticky bottom-0 bg-[#1A1F2C]/60 backdrop-blur-xl pt-2">
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
};
