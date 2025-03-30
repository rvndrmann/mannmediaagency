
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Message } from "@/types/message";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AgentSelector } from "./AgentSelector";

interface MultiAgentChatProps {
  projectId?: string;
  sessionId?: string;
}

export function MultiAgentChat({ projectId, sessionId }: MultiAgentChatProps) {
  const { messages, setMessages, isLoading } = useChatSession();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("main");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages update
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Add user message to the chat
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
      };
      
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      
      // Show thinking indicator
      const assistantThinkingMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "thinking",
        agentType: selectedAgent
      };
      
      setMessages([...newMessages, assistantThinkingMessage]);
      
      // Call the unified agent edge function
      const { data, error } = await supabase.functions.invoke('unified-agent', {
        body: {
          input: input,
          projectId: projectId,
          agentType: selectedAgent,
          userId: crypto.randomUUID(), // Ideally use actual user ID here from auth
          sessionId: sessionId || projectId,
        }
      });
      
      if (error) {
        console.error("Error calling unified-agent:", error);
        toast.error("Failed to get response from agent");
        
        // Update the thinking message to show the error
        const errorMessage: Message = {
          id: assistantThinkingMessage.id,
          role: "assistant",
          content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          createdAt: new Date().toISOString(),
          status: "error",
          agentType: selectedAgent
        };
        
        setMessages([...newMessages, errorMessage]);
      } else if (data) {
        // Replace the thinking message with the actual response
        const assistantMessage: Message = {
          id: assistantThinkingMessage.id,
          role: "assistant",
          content: data.response || "I processed your request but don't have a specific response.",
          createdAt: new Date().toISOString(),
          agentType: data.agentType || selectedAgent,
        };
        
        setMessages([...newMessages, assistantMessage]);
      }
      
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 container py-4 max-w-4xl mx-auto">
        <Card className="w-full h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Multi-Agent Chat</h2>
            <AgentSelector 
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
              disabled={isProcessing}
            />
          </div>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
