
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Message } from "@/types/message";
import { useAgentSdkChat } from "@/hooks/use-agent-sdk-chat";
import { AgentSelector } from "@/components/multi-agent/AgentSelector";

interface AgentSdkChatProps {
  projectId?: string;
  sessionId?: string;
  onMessageComplete?: (message: Message) => void;
  showAgentSelector?: boolean;
  defaultAgent?: string;
}

export function AgentSdkChat({
  projectId,
  sessionId,
  onMessageComplete,
  showAgentSelector = true,
  defaultAgent = "assistant"
}: AgentSdkChatProps) {
  const [input, setInput] = useState("");
  
  const {
    messages,
    isProcessing,
    selectedAgent,
    setSelectedAgent,
    sendMessage
  } = useAgentSdkChat({
    projectId,
    sessionId,
    onMessageComplete
  });
  
  const handleAgentChange = useCallback((agentType: string) => {
    setSelectedAgent(agentType as any);
  }, [setSelectedAgent]);
  
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendMessage(input)) {
      setInput("");
    }
  }, [input, sendMessage]);
  
  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Canvas Assistant</h2>
        {showAgentSelector && (
          <AgentSelector
            selectedAgent={selectedAgent}
            onSelectAgent={handleAgentChange}
            disabled={isProcessing}
          />
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">
              How can I help with your Canvas project today?
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage}>
          <ChatInput
            input={input}
            isLoading={isProcessing}
            onInputChange={setInput}
            onSubmit={handleSendMessage}
            placeholder={`Send a message to the ${selectedAgent} agent...`}
          />
        </form>
      </div>
    </Card>
  );
}
