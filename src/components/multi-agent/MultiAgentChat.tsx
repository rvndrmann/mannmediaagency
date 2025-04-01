
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chat/ChatMessage"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { Loader2, Send } from "lucide-react";
import { useMCPContext } from "@/contexts/MCPContext";
import { useToast } from "@/components/ui/use-toast";
import { useAgentHistory } from "@/hooks/multi-agent/agent-history";
import { useProjectContext } from "@/hooks/multi-agent/project-context";

interface MultiAgentChatProps {
  isEmbedded?: boolean;
  onBack?: () => void;
  projectId?: string;
  sceneId?: string;
  sessionId?: string; 
  compactMode?: boolean;
  onAgentCommand?: (command: any) => Promise<void>;
}

export function MultiAgentChat({ 
  isEmbedded = false,
  onBack,
  projectId,
  sceneId,
  sessionId,
  compactMode = false,
  onAgentCommand
}: MultiAgentChatProps) {
  const { toast } = useToast();
  const { activeProject } = useProjectContext();
  const { mcpConnected } = useMCPContext();
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string>("main");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateAgentHistory } = useAgentHistory();
  
  // Get the active chat session based on the sessionId prop or the active session
  const { 
    sessions,
    activeChatId, 
    setActiveChatId, 
    updateChatSession,
    createChatSession
  } = useChatSession();
  
  // Use the sessionId prop if provided, otherwise use the activeChatId
  const currentSessionId = sessionId || activeChatId;
  const currentSession = currentSessionId ? sessions[currentSessionId] : null;
  const messages = currentSession?.messages || [];
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !isEmbedded) {
      inputRef.current.focus();
    }
  }, [isEmbedded]);
  
  // Set active chat session when sessionId changes
  useEffect(() => {
    if (sessionId && sessionId !== activeChatId) {
      setActiveChatId(sessionId);
    }
  }, [sessionId, activeChatId, setActiveChatId]);
  
  async function handleSendMessage() {
    if (!userInput.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: userInput,
      createdAt: new Date().toISOString()
    };
    
    // Update the chat session with the user message
    let updatedMessages = [...messages, userMessage];
    if (currentSessionId) {
      updateChatSession(currentSessionId, updatedMessages);
    } else {
      // Create a new session if none exists
      const newSessionId = createChatSession(projectId || null, [userMessage]);
      setActiveChatId(newSessionId);
    }
    
    setUserInput("");
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/multi-agent-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: userInput,
          agentType: activeAgent,
          conversationHistory: messages,
          usePerformanceModel: false,
          projectId: projectId || activeProject,
          sceneId: sceneId,
          runId: currentSessionId || uuidv4(),
          groupId: currentSessionId || uuidv4(),
          contextData: projectId ? { projectId, sceneId } : null
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle handoffs between agents
      if (data.handoffRequest) {
        setActiveAgent(data.handoffRequest.targetAgent);
        updateAgentHistory(activeAgent, data.handoffRequest.targetAgent, data.handoffRequest.reason);
      }
      
      // Handle agent commands
      if (data.command && onAgentCommand) {
        await onAgentCommand(data.command);
      }
      
      // Create the assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: data.content,
        agentType: data.agentType || activeAgent,
        createdAt: new Date().toISOString(),
        command: data.command
      };
      
      // Update the chat session with the assistant message
      updatedMessages = [...updatedMessages, assistantMessage];
      if (currentSessionId) {
        updateChatSession(currentSessionId, updatedMessages);
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }
  
  return (
    <div className={`flex flex-col h-full ${isEmbedded ? "" : "max-w-4xl mx-auto"}`}>
      {/* Message area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              compact={compactMode}
              showAgentLabel={true}
            />
          ))}
          
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              No messages yet. Start a conversation with the assistant.
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-center mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Agent is thinking...</span>
            </div>
          )}
          
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${getAgentName(activeAgent)}...`}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !userInput.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {!mcpConnected && (
          <div className="text-xs text-amber-500 mt-1">
            MCP not connected. Some features may be limited.
          </div>
        )}
      </div>
    </div>
  );
}

function getAgentName(agentType: string): string {
  switch (agentType) {
    case "main": return "Assistant";
    case "script": return "Script Writer";
    case "image": return "Image Generator";
    case "tool": return "Tool Specialist";
    case "scene": return "Scene Creator";
    default: return "AI Assistant";
  }
}
