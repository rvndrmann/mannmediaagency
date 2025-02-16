
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ChatPanel } from "@/components/ai-agent/ChatPanel";
import { useAIChat } from "@/hooks/use-ai-chat";

const AIAgent = () => {
  const navigate = useNavigate();
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    userCredits
  } = useAIChat();

  return (
    <div className="min-h-screen bg-[#1A1F2C]">
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">AI Agent</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  onInputChange={setInput}
                  onSubmit={handleSubmit}
                />
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4 h-[calc(100vh-8rem)]">
            <ScriptBuilderTab messages={messages} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
