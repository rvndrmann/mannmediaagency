
import { Message } from "@/types/message";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="h-full flex flex-col bg-[#1E2432] border-l border-white/10">
      <div className="border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-white/60 md:hidden"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Chat</h2>
            <p className="text-xs text-white/60">
              {userCredits ? `${userCredits.credits_remaining} credits remaining` : "Loading credits..."}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 pb-20"> {/* Added padding to the bottom to ensure messages don't get hidden behind the input */}
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 left-0 right-0 p-3 border-t border-white/10 bg-[#1E2432] mt-auto">
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          useAssistantsApi={useAssistantsApi}
          setUseAssistantsApi={setUseAssistantsApi}
          useMcp={useMcp}
          setUseMcp={setUseMcp}
        />
      </div>
    </div>
  );
}
