
import { Message } from "@/types/message";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";

interface SidePanelProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  userCredits: { credits_remaining: number } | null;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  useAssistantsApi?: boolean;
  setUseAssistantsApi?: (value: boolean) => void;
  useMcp?: boolean;
  setUseMcp?: (value: boolean) => void;
}

export function SidePanel({
  messages,
  input,
  isLoading,
  userCredits,
  onInputChange,
  onSubmit,
  onBack,
  useAssistantsApi = false,
  setUseAssistantsApi = () => {},
  useMcp = false,
  setUseMcp = () => {}
}: SidePanelProps) {
  return (
    <div className="h-full flex flex-col bg-[#1A1F29] relative">
      <div className="absolute top-2 right-3 text-xs text-white/60 bg-[#262B38] px-2 py-1 rounded-md z-20">
        Credits: {userCredits ? userCredits.credits_remaining.toFixed(2) : "Loading..."}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="space-y-4 pb-4">
            {messages.map((message, index) => (
              <div key={index}>
                <ChatMessage message={message} />
                {message.role === "assistant" && (
                  <div className="mt-1 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>All tasks completed</span>
                    </div>
                    <div className="flex flex-col ml-4 mt-1">
                      <div className="flex items-center gap-1 text-white/40">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Analyzing your request</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Processing with AI</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Preparing response</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="sticky bottom-0 left-0 right-0 p-3 border-t border-white/10 bg-[#1A1F29] z-10">
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          useAssistantsApi={useAssistantsApi}
          setUseAssistantsApi={setUseAssistantsApi}
          useMcp={useMcp}
          setUseMcp={setUseMcp}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}
