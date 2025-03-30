
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
import { ProjectSelector } from "@/components/multi-agent/ProjectSelector";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";

interface MultiAgentChatProps {
  projectId?: string;
  sessionId?: string;
}

export function MultiAgentChat({ projectId, sessionId }: MultiAgentChatProps) {
  const { messages, isLoading } = useChatSession();
  const [input, setInput] = useState("");
  const [localProjectId, setLocalProjectId] = useState<string | undefined>(projectId);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleError = useCallback((error: Error) => {
    toast.error(`Error: ${error.message}`);
    console.error("Chat error:", error);
  }, []);
  
  const {
    isProcessing,
    selectedAgent,
    setSelectedAgent,
    sendMessage,
    error
  } = useMultiAgentChat({
    projectId: localProjectId,
    onError: handleError
  });
  
  // Show error toast when error state changes
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    if (!scrollRef.current) return;
    
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);
  
  // Update agent based on handoff requests
  useEffect(() => {
    // Find the latest message with a handoff request
    const lastHandoffMessage = [...messages]
      .reverse()
      .find(message => message.handoffRequest && message.role === "assistant");
    
    if (lastHandoffMessage?.handoffRequest) {
      const targetAgent = lastHandoffMessage.handoffRequest.targetAgent;
      console.log(`Detected handoff to ${targetAgent} agent`);
      
      // Update the selected agent if it's different
      if (selectedAgent !== targetAgent) {
        setSelectedAgent(targetAgent);
        toast.info(`Switched to ${targetAgent} agent`);
      }
    }
  }, [messages, selectedAgent, setSelectedAgent]);
  
  const handleAgentChange = useCallback((agentType: string) => {
    setSelectedAgent(agentType);
  }, [setSelectedAgent]);
  
  const handleProjectSelect = useCallback((newProjectId: string) => {
    // If we're already using this project, don't re-initialize
    if (newProjectId === localProjectId) return;
    
    // Update the local project ID state
    setLocalProjectId(newProjectId);
    
    // Reset chat state to prevent UI issues
    setInput("");
  }, [localProjectId]);
  
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === "" || isProcessing) return;
    
    const success = await sendMessage(input);
    if (success) {
      setInput("");
    }
  }, [input, sendMessage, isProcessing]);
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 container py-4 max-w-4xl mx-auto">
        <Card className="w-full h-full flex flex-col overflow-hidden border rounded-lg shadow-md">
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">Multi-Agent Chat</h2>
                {selectedAgent && (
                  <Badge variant="secondary" className="flex items-center">
                    {selectedAgent} agent
                  </Badge>
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="w-full md:w-[220px]">
                  <ProjectSelector 
                    selectedProjectId={localProjectId} 
                    onProjectSelect={handleProjectSelect}
                  />
                </div>
                <div className="w-full md:w-[180px]">
                  <AgentSelector 
                    selectedAgent={selectedAgent}
                    onSelectAgent={handleAgentChange}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
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
                  <p className="mb-2">Start chatting with an AI agent to get help with your project.</p>
                  {localProjectId && (
                    <p className="text-sm">
                      You are working with Project ID: {localProjectId}
                    </p>
                  )}
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
                placeholder={`Send a message to the ${selectedAgent || "AI"} agent...`}
              />
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
