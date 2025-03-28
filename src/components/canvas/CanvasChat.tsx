
import { useState } from "react";
import { Message } from "@/types/message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { XCircle, MessageSquare, Bot } from "lucide-react";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { AgentSelector } from "@/components/multi-agent/AgentSelector";

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
    handleSubmit,
    switchAgent,
  } = useMultiAgentChat();

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
      
      <div className="p-3 border-b border-gray-700/50">
        <AgentSelector selectedAgentId={activeAgent} onSelect={switchAgent} />
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {messages.length > 0 ? (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <ChatMessage 
                key={index} 
                message={message} 
                showAgentName={message.role === "assistant" && message.agentType !== undefined}
              />
            ))}
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
        <div className="absolute top-2 right-3 text-xs text-white/60 bg-[#262B38] px-2 py-1 rounded-md">
          Credits: {userCredits ? userCredits.credits_remaining.toFixed(2) : "Loading..."}
        </div>
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
