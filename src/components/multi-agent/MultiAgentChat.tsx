
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { ChatHeader } from "./ChatHeader";
import { AgentSelector } from "./AgentSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AgentInstructionsTable } from "./AgentInstructionsTable";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [showInstructions, setShowInstructions] = useState(false);

  // Enable realtime for relevant tables when the component mounts
  useEffect(() => {
    const enableRealtime = async () => {
      try {
        await supabase.functions.invoke("enable-realtime");
        console.log("Realtime enabled for media generation tables");
      } catch (error) {
        console.error("Error enabling realtime:", error);
      }
    };
    
    enableRealtime();
  }, []);

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

  const toggleInstructions = () => {
    setShowInstructions(prev => !prev);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#1A1F29] to-[#232836]">
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
            <div className="flex flex-col space-y-2">
              <AgentSelector 
                activeAgent={activeAgent}
                onAgentSelect={switchAgent}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleInstructions}
                className="self-end flex items-center gap-1 text-xs text-gray-400 hover:text-white border-gray-700"
              >
                {showInstructions ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide Instructions
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show Instructions
                  </>
                )}
              </Button>
            </div>
            
            {showInstructions && (
              <AgentInstructionsTable activeAgent={activeAgent} />
            )}
            
            {messages.length === 0 && (
              <div className="text-center py-12 animate-fadeIn">
                <h3 className="text-white/70 text-lg font-medium mb-2">Welcome to Multi-Agent Chat</h3>
                <p className="text-white/50 max-w-md mx-auto">
                  Select an agent type and start chatting. Each agent specializes in different tasks:
                  script writing, image prompts, or tool orchestration.
                </p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className="animate-fadeIn">
                <ChatMessage message={message} />
              </div>
            ))}
            <div ref={lastMessageRef} className="h-px" />
          </div>
        </ScrollArea>
      </div>

      <div className="sticky bottom-0 left-0 right-0 w-full bg-[#1A1F2C]/95 backdrop-blur-xl border-t border-white/10 p-4 z-10 mb-12 md:mb-0 shadow-lg">
        <div className="absolute -top-10 right-4 p-2 bg-[#262B38] backdrop-blur-lg rounded-t-lg z-10 flex items-center space-x-2 border-t border-l border-r border-white/10 shadow-md">
          <span className="text-sm font-medium text-white/80">
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
