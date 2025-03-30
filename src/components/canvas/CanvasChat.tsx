
import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { X, MessageSquare } from "lucide-react";
import { useChatSession, ChatSessionProvider } from "@/contexts/ChatSessionContext";
import { toast } from "sonner";
import { Message } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

interface CanvasChatContentProps {
  projectId?: string;
  onClose: () => void;
}

function CanvasChatContent({ projectId, onClose }: CanvasChatContentProps) {
  const { 
    getOrCreateChatSession,
    messages,
    isLoading,
    status,
    setMessages
  } = useChatSession();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize chat session for this project
  useEffect(() => {
    if (projectId && !initialized) {
      getOrCreateChatSession(projectId);
      setInitialized(true);
    }
  }, [projectId, getOrCreateChatSession, initialized]);
  
  // Add welcome message if needed
  useEffect(() => {
    if (initialized && messages.length === 0 && projectId) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "system",
        content: `Welcome to Canvas Assistant. I'm here to help with your video project${projectId ? " #" + projectId : ""}. Ask me to write scripts, create scene descriptions, or generate image prompts for your scenes.`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages([welcomeMessage]);
    }
  }, [initialized, messages.length, projectId, setMessages]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !projectId || isProcessing) return;
    
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
      
      // Show typing indicator
      const assistantTypingMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "thinking",
      };
      
      setMessages([...newMessages, assistantTypingMessage]);
      
      // Call the agent-sdk function
      const { data, error } = await supabase.functions.invoke('agent-sdk', {
        body: {
          input: input,
          projectId: projectId,
          agentType: 'assistant',
          sessionId: projectId,
        }
      });
      
      if (error) {
        console.error("Error calling agent-sdk:", error);
        toast.error("Failed to get response from Canvas Assistant");
        
        // Update the typing message to show the error
        const errorMessage: Message = {
          id: assistantTypingMessage.id,
          role: "assistant",
          content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          createdAt: new Date().toISOString(),
          status: "error",
        };
        
        setMessages([...newMessages, errorMessage]);
      } else if (data) {
        // Replace the typing message with the actual response
        const assistantMessage: Message = {
          id: assistantTypingMessage.id,
          role: "assistant",
          content: data.response || "I processed your request but don't have a specific response.",
          createdAt: new Date().toISOString(),
          agentType: data.agentType,
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
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-medium">Canvas Assistant</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
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
              Start chatting with the Canvas Assistant to get help with your project.
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          
          {status === 'loading' && (
            <Skeleton className="h-10 w-3/4 mx-auto" />
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage}>
          <ChatInput
            input={input}
            isLoading={status === 'loading' || isProcessing}
            onInputChange={setInput}
            onSubmit={handleSendMessage}
          />
        </form>
      </div>
    </div>
  );
}

export function CanvasChat({ projectId, onClose }: CanvasChatContentProps) {
  return (
    <ChatSessionProvider>
      <CanvasChatContent projectId={projectId} onClose={onClose} />
    </ChatSessionProvider>
  );
}

export function ChatToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0"
      onClick={onClick}
    >
      <MessageSquare className="h-5 w-5" />
    </Button>
  );
}
