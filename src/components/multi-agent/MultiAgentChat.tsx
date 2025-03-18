
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { ChatHeader } from "./ChatHeader";
import { AgentSelector } from "./AgentSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Attachment } from "@/types/message";

export const MultiAgentChat = () => {
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
    clearChat,
    addAttachments,
    removeAttachment
  } = useMultiAgentChat();
  
  const navigate = useNavigate();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const handleBack = () => {
    navigate("/");
  };
  
  const scrollToBottom = () => {
    if (lastMessageRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTop = scrollHeight;
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#1A1F29]">
      <ChatHeader 
        onBack={handleBack} 
        onClearChat={clearChat} 
        activeAgent={activeAgent}
      />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 min-h-[calc(100vh-16rem)]"
        >
          <div className="p-4 space-y-4">
            <AgentSelector 
              activeAgent={activeAgent}
              onAgentSelect={switchAgent}
            />
            
            {messages.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-white/70 text-lg font-medium mb-2">Welcome to Multi-Agent Chat</h3>
                <p className="text-white/50 max-w-md mx-auto">
                  Select an agent type and start chatting. Each agent specializes in different tasks:
                  script writing, image prompts, or tool orchestration.
                </p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={lastMessageRef} className="h-px" />
          </div>
        </ScrollArea>
      </div>

      <div className="sticky bottom-0 left-0 right-0 w-full bg-[#1A1F2C]/95 backdrop-blur-xl border-t border-white/10 p-4 z-10 mb-12 md:mb-0">
        <div className="absolute top-0 right-0 p-2 bg-white/5 backdrop-blur-lg rounded-bl-lg z-10 flex items-center space-x-2">
          <span className="text-sm text-white/80">
            Credits: {userCredits?.credits_remaining.toFixed(2) || 0}
          </span>
        </div>
        
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          attachments={pendingAttachments}
          onAttachmentAdd={addAttachments}
          onAttachmentRemove={removeAttachment}
          showAttachmentButton={true}
        />
      </div>
    </div>
  );
};
