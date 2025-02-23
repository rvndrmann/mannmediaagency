
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
    <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4 h-[calc(100vh-8rem)] flex flex-col">
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="w-full bg-[#333333] mb-4">
          <TabsTrigger 
            value="chat" 
            className="flex-1 text-white data-[state=active]:bg-[#444444]"
          >
            Chat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 flex flex-col m-0">
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
