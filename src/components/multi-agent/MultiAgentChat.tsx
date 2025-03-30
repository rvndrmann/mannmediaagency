
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Message } from "@/types/message";
import { AgentSelector } from "@/components/multi-agent/AgentSelector";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";

interface MultiAgentChatProps {
  projectId?: string;
  sessionId?: string;
}

export function MultiAgentChat({ projectId, sessionId }: MultiAgentChatProps) {
  const { messages, isLoading } = useChatSession();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    isProcessing,
    selectedAgent,
    setSelectedAgent,
    sendMessage
  } = useMultiAgentChat(projectId);
  
  // Scroll to bottom when messages update - debounced to prevent too many updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);
  
  const handleAgentChange = useCallback((agentType: string) => {
    setSelectedAgent(agentType);
  }, [setSelectedAgent]);
  
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendMessage(input)) {
      setInput("");
    }
  }, [input, sendMessage]);
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 container py-4 max-w-4xl mx-auto">
        <Card className="w-full h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Multi-Agent Chat</h2>
            <AgentSelector 
              selectedAgent={selectedAgent}
              onSelectAgent={handleAgentChange}
              disabled={isProcessing}
            />
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground p-4">
                  Start chatting with an AI agent to get help with your project.
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
              <div ref={scrollRef} />
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
      </div>
    </div>
  );
}
