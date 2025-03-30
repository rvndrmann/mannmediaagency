
import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { toast } from "sonner";
import { Message } from "@/types/message";

interface CanvasChatProps {
  projectId?: string;
  onClose: () => void;
}

export function CanvasChat({ projectId, onClose }: CanvasChatProps) {
  const { 
    getOrCreateChatSession,
    messages,
    isLoading,
    sendMessage,
    status
  } = useChatSession();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (projectId) {
      // Create welcome message
      const welcomeMessage: Message = {
        id: "welcome",
        role: "system",
        content: `Welcome to Canvas Assistant. I'm here to help with your video project${projectId ? " #" + projectId : ""}. Ask me to write scripts, create scene descriptions, or generate image prompts for your scenes.`,
        createdAt: new Date().toISOString(),
      };
      
      getOrCreateChatSession(projectId, 'canvas');
    }
  }, [projectId, getOrCreateChatSession]);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !projectId) return;
    
    try {
      await sendMessage({
        content: input,
        context: {
          projectId,
          type: 'canvas'
        }
      });
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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
            isLoading={status === 'loading'}
            onInputChange={setInput}
            onSubmit={handleSendMessage}
          />
        </form>
      </div>
    </div>
  );
}
