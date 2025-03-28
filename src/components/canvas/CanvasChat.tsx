
import { useState, useRef, useEffect } from "react";
import { Message } from "@/types/message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { XCircle, MessageSquare, Bot, Paperclip } from "lucide-react";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { AgentSelector } from "@/components/multi-agent/AgentSelector";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";
import { FileAttachmentButton } from "@/components/multi-agent/FileAttachmentButton";
import { toast } from "sonner";

interface CanvasChatProps {
  onClose: () => void;
}

export function CanvasChat({ onClose }: CanvasChatProps) {
  const { 
    messages, 
    input, 
    setInput, 
    isLoading, 
    activeAgent,
    userCredits,
    pendingAttachments,
    handleSubmit,
    switchAgent,
    addAttachments,
    removeAttachment
  } = useMultiAgentChat();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (lastMessageRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#1A1F29] border-r border-gray-700/50">
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-medium text-white">AI Assistant</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <XCircle className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="border-b border-gray-700/50">
        <AgentSelector selectedAgentId={activeAgent} onSelect={switchAgent} />
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length > 0 ? (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <ChatMessage 
                key={index} 
                message={message} 
                showAgentName={message.role === "assistant" && message.agentType !== undefined}
              />
            ))}
            <div ref={lastMessageRef} className="h-px" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="bg-primary/10 p-3 rounded-full mb-3">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white">Canvas Assistant</h3>
            <p className="text-sm text-gray-400 max-w-[250px] mt-2">
              Ask me about your video project or for help with specific scenes.
            </p>
          </div>
        )}
      </ScrollArea>
      
      <div className="p-3 border-t border-gray-700/50">
        <div className="text-xs text-white/60 bg-[#262B38] px-2 py-1 rounded-md mb-2">
          Credits: {userCredits ? userCredits.credits_remaining.toFixed(2) : "Loading..."}
        </div>

        {pendingAttachments && pendingAttachments.length > 0 && (
          <div className="mb-2">
            <AttachmentPreview
              attachments={pendingAttachments}
              onRemove={removeAttachment}
              isRemovable={true}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <ChatInput
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              showAttachmentButton={false}
            />
          </div>
          
          <FileAttachmentButton onAttach={addAttachments} />
        </div>
      </div>
    </div>
  );
}
