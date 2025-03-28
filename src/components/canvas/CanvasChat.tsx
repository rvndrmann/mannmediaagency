
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Paperclip, Loader2 } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Message, Attachment } from "@/types/message";
import { toast } from "sonner";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat"; 
import type { AgentType } from "@/hooks/use-multi-agent-chat";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";

interface CanvasChatProps {
  projectId?: string;
  onClose: () => void;
}

export function CanvasChat({ projectId, onClose }: CanvasChatProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    sendMessage,
    activeAgent,
    switchAgent
  } = useMultiAgentChat({
    initialMessages: [
      {
        id: "welcome",
        role: "system",
        content: "Welcome to Canvas Assistant. How can I help you with your video project today?",
        createdAt: new Date().toISOString(),
      }
    ],
    onAgentSwitch: (from, to) => {
      toast.info(`Switched from ${from} agent to ${to} agent`);
    }
  });
  
  // Get canvas-specific agent capabilities
  const { agentMessages } = useCanvasAgent({
    projectId,
    sceneId: null,
    updateScene: async () => {}
  });
  
  // Effect to merge canvas agent messages if needed
  useEffect(() => {
    if (agentMessages.length > 0 && activeAgent === 'scene') {
      // Could implement logic to merge canvas-specific messages
      // for now just informing that we have canvas context
      console.log('Canvas agent messages available for context:', agentMessages.length);
    }
  }, [agentMessages, activeAgent]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() && attachments.length === 0) return;
    
    if (!projectId) {
      toast.error("No project selected");
      return;
    }
    
    try {
      // Enhanced context for canvas-related queries
      const contextData = {
        projectType: "canvas",
        projectId,
        canvasContext: true
      };
      
      // Automatically switch to scene agent for scene-related queries
      const inputLower = input.toLowerCase();
      if (
        activeAgent !== "scene" && 
        (inputLower.includes("scene") || 
         inputLower.includes("visual") || 
         inputLower.includes("shot"))
      ) {
        await switchAgent("scene" as AgentType);
        toast.info("Switched to Scene Creator agent for your request");
      }
      
      await sendMessage(input, activeAgent as AgentType);
      setInput("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };
  
  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };
  
  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attach => attach.id !== id));
  };
  
  const handleAttachments = (files: File[]) => {
    const newAttachments: Attachment[] = files.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border-r">
      <div className="p-4 border-b flex justify-between items-center bg-background">
        <h3 className="font-medium">Canvas Assistant</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage 
              key={message.id || index} 
              message={message}
              showAgentName
            />
          ))}
          <div ref={messagesEndRef} />
          
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t">
          <div className="flex flex-wrap gap-2">
            {attachments.map(attachment => (
              <div 
                key={attachment.id} 
                className="flex items-center gap-1 bg-muted text-muted-foreground rounded px-2 py-1"
              >
                <span className="text-xs truncate max-w-[100px]">
                  {attachment.name}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4" 
                  onClick={() => handleRemoveAttachment(attachment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleAttachmentClick}
          className="shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your video project..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading} className="shrink-0">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
