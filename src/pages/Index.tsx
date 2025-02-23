
import { ChatPanel } from "@/components/ai-agent/ChatPanel";
import { useAIChat } from "@/hooks/use-ai-chat";

const Index = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    userCredits
  } = useAIChat();

  return (
    <div className="min-h-screen bg-[#1A1F2C] p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">AI Chat Assistant</h1>
        <ChatPanel
          messages={messages}
          input={input}
          isLoading={isLoading}
          userCredits={userCredits}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default Index;
