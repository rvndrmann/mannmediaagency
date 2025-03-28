import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { ChatInput } from "@/components/chat/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { useState, useRef, useEffect } from "react";
import { AgentSelector } from "./AgentSelector";
import { FileAttachmentButton } from "./FileAttachmentButton";
import { AttachmentPreview } from "./AttachmentPreview";
import { Button } from "@/components/ui/button";
import { Zap, Trash2, Hammer, BarChartBig } from "lucide-react";
import { toast } from "sonner";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { AgentInstructionsTable } from "./AgentInstructionsTable";

export const MultiAgentChat = () => {
  const { 
    messages, 
    input, 
    setInput, 
    isLoading, 
    activeAgent,
    userCredits, 
    pendingAttachments,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    handleSubmit, 
    switchAgent, 
    clearChat,
    addAttachments,
    removeAttachment,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing
  } = useMultiAgentChat();
  
  const [showInstructions, setShowInstructions] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (lastMessageRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const scrollHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTop = scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#1A1F29] to-[#121827]">
      <header className="p-2 flex items-center justify-between bg-[#1A1F29]/80 backdrop-blur-sm border-b border-white/10">
        <div>
          <h1 className="text-lg font-semibold text-white">AI Multi-Agent Chat</h1>
          <p className="text-xs text-gray-400">Interact with specialized AI agents</p>
        </div>
        
        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={usePerformanceModel ? "outline" : "default"} 
                  size="sm"
                  onClick={togglePerformanceMode}
                  className={`flex items-center gap-1 text-xs h-6 px-2 ${
                    usePerformanceModel 
                      ? "border-yellow-600 bg-yellow-800/20 text-yellow-500 hover:bg-yellow-800/30" 
                      : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  {usePerformanceModel ? "Performance" : "High Quality"}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#2D3240] border-[#434759] text-white">
                <p className="text-xs">{usePerformanceModel ? "Faster responses with GPT-4o-mini" : "Higher quality responses with GPT-4o"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={enableDirectToolExecution ? "default" : "outline"} 
                  size="sm"
                  onClick={toggleDirectToolExecution}
                  className={`flex items-center gap-1 text-xs h-6 px-2 ${
                    enableDirectToolExecution 
                      ? "bg-gradient-to-r from-green-600 to-teal-600" 
                      : "border-teal-600 bg-teal-800/20 text-teal-500 hover:bg-teal-800/30"
                  }`}
                >
                  <Hammer className="h-3 w-3" />
                  {enableDirectToolExecution ? "Direct Tools" : "Tool Agent"}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#2D3240] border-[#434759] text-white">
                <p className="text-xs">{enableDirectToolExecution ? "Any agent can use tools directly" : "Tools require handoff to tool agent"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={tracingEnabled ? "default" : "outline"} 
                  size="sm"
                  onClick={toggleTracing}
                  className={`flex items-center gap-1 text-xs h-6 px-2 ${
                    tracingEnabled 
                      ? "bg-gradient-to-r from-purple-600 to-pink-600" 
                      : "border-purple-600 bg-purple-800/20 text-purple-500 hover:bg-purple-800/30"
                  }`}
                >
                  <BarChartBig className="h-3 w-3" />
                  {tracingEnabled ? "Tracing On" : "Tracing Off"}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#2D3240] border-[#434759] text-white">
                <p className="text-xs">{tracingEnabled ? "Detailed interaction tracing is enabled" : "Interaction tracing is disabled"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleInstructions}
            className="border-gray-600 bg-gray-800/50 hover:bg-gray-700/70 text-white text-xs h-6 px-2"
          >
            {showInstructions ? "Hide" : "Show"} Instructions
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    clearChat();
                    toast.success("Chat history cleared");
                  }}
                  className="bg-red-900/50 hover:bg-red-800/70 text-white h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#2D3240] border-[#434759] text-white">
                <p className="text-xs">Clear chat history</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>
      
      <div className="flex-1 container mx-auto max-w-4xl px-4 pb-2 pt-2 flex flex-col h-full overflow-hidden">
        <AgentSelector selectedAgentId={activeAgent} onSelect={switchAgent} />
        
        {showInstructions && <AgentInstructionsTable activeAgent={activeAgent} />}
        
        <div className="flex-1 flex flex-col overflow-hidden bg-[#21283B]/60 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg">
          {messages.length > 0 ? (
            <ScrollArea ref={scrollAreaRef} className="flex-1">
              <div className="p-4 space-y-6">
                {messages.map((message, index) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    showAgentName={message.role === "assistant" && message.agentType !== undefined}
                  />
                ))}
                <div ref={lastMessageRef} className="h-px" />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <div className="mb-3 bg-gradient-to-r from-blue-400 to-indigo-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-5 h-5 text-white"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M13 8H7" />
                  <path d="M17 12H7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-white mb-1">Multi-Agent AI Chat</h2>
              <p className="text-xs text-gray-400 max-w-md">
                Choose an agent type above and start chatting. Each agent specializes in different tasks - use the main assistant for general help, or select a specialized agent for specific needs.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-2 bg-[#21283B]/40 backdrop-blur-sm rounded-xl border border-white/10 p-2">
          {pendingAttachments.length > 0 && (
            <div className="mb-1.5">
              <AttachmentPreview
                attachments={pendingAttachments}
                onRemove={removeAttachment}
                isRemovable={true}
              />
            </div>
          )}
          
          <div className="flex items-end gap-1 w-full">
            <div className="flex-1">
              <ChatInput
                input={input}
                isLoading={isLoading}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                showAttachmentButton={false}
              />
            </div>
            
            <div className="flex-shrink-0 flex items-end mb-1.5 mr-1.5">
              <FileAttachmentButton onAttach={addAttachments} />
            </div>
          </div>
          
          <div className="mt-1 text-[10px] text-gray-500 flex justify-between">
            <div>
              Credits: {userCredits?.credits_remaining.toFixed(2) || "0.00"} (0.07 per message)
            </div>
            <div className="flex justify-end gap-2">
              <div>
                Model: {usePerformanceModel ? "GPT-4o-mini (faster)" : "GPT-4o (higher quality)"}
              </div>
              <div>
                Tool Access: {enableDirectToolExecution ? "Direct (any agent)" : "Via Tool Agent"}
              </div>
              <div>
                Tracing: {tracingEnabled ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
