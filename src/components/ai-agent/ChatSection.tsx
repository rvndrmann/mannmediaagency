
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "@/components/ai-agent/ChatPanel";

interface ChatSectionProps {
  messages: any[];
  input: string;
  isLoading: boolean;
  userCredits: any;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChatSection({
  messages,
  input,
  isLoading,
  userCredits,
  onInputChange,
  onSubmit
}: ChatSectionProps) {
  return (
    <Card className="h-full flex flex-col bg-transparent border-0 shadow-none">
      <Tabs defaultValue="chat" className="flex-1 flex flex-col h-full">
        <TabsList className="w-full bg-[#333333]/50 backdrop-blur-lg sticky top-0 z-30">
          <TabsTrigger 
            value="chat" 
            className="flex-1 text-white data-[state=active]:bg-[#444444]"
          >
            Chat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-6rem)]">
          <ChatPanel
            messages={messages}
            input={input}
            isLoading={isLoading}
            userCredits={userCredits}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
