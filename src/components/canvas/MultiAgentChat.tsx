import React, { useEffect, useState, useRef, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMCPContext } from "@/contexts/MCPContext";
import { v4 as uuidv4 } from "uuid";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Message } from "@/types/message";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { Link } from "react-router-dom";

// Define props for the component
interface MultiAgentChatProps {
  projectId?: string;
  sceneId?: string;
  onBack?: () => void;
  isEmbedded?: boolean;
  sessionId?: string;
  compactMode?: boolean;
  onAgentCommand?: (command: any) => Promise<void>;
}

export const MultiAgentChat: React.FC<MultiAgentChatProps> = ({
  projectId,
  sceneId,
  onBack,
  isEmbedded = false,
  sessionId,
  compactMode = false,
  onAgentCommand
}) => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  
  // Access MCP context
  const { status: mcpStatus, reconnectToMcp } = useMCPContext();
  const isSDKConnected = mcpStatus === 'connected';
  
  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input on mount if not embedded
  useEffect(() => {
    if (inputRef.current && !isEmbedded) {
      inputRef.current.focus();
    }
  }, [isEmbedded]);

  // Initialize connection to MCP on mount
  useEffect(() => {
    if (mcpStatus !== 'connected') {
      reconnectToMcp().catch(error => {
        console.error("Failed to connect to MCP:", error);
      });
    }
  }, [mcpStatus, reconnectToMcp]);

  // Handle sending a chat message
  const handleSubmitChat = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: inputValue,
      createdAt: new Date().toISOString()
    };

    // Update messages state with user message
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send message to the agent
      const response = await fetch("/api/multi-agent-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: userMessage.content,
          agentType: activeAgent,
          conversationHistory: messages,
          usePerformanceModel: false,
          projectId: projectId,
          sceneId: sceneId,
          runId: sessionId || uuidv4(),
          groupId: sessionId || uuidv4(),
          contextData: projectId ? { projectId, sceneId } : null,
          useSDK: true // Enable SDK mode
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      // Handle handoffs between agents
      if (data.handoffRequest) {
        setActiveAgent(data.handoffRequest.targetAgent as AgentType);
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

      // Update messages state with assistant response
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcut for sending message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  // Function to get the appropriate agent name for display
  const getAgentName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main": return "Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      case "data": return "Data Agent";
      default: return "Assistant";
    }
  };

  return (
    <main className={`flex flex-col h-full ${isEmbedded ? "bg-[#111827]" : "bg-background min-h-screen"}`}>
      {!isEmbedded && (
        <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Multi-Agent Chat</h1>
          {onBack ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="text-primary-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <Link to="/canvas">
              <Button 
                variant="outline" 
                size="sm"
                className="hover:bg-primary-foreground/10"
              >
                Go to Canvas
              </Button>
            </Link>
          )}
        </header>
      )}
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p className="text-center">
                {isSDKConnected 
                  ? "Start a conversation with the AI assistant."
                  : "Connecting to the AI system..."}
              </p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary/10 ml-12'
                  : 'bg-secondary/50 mr-12'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">
                  {msg.role === 'user'
                    ? 'You'
                    : msg.agentType
                    ? getAgentName(msg.agentType as AgentType)
                    : 'Assistant'}
                </span>
              </div>
              <p className={`whitespace-pre-wrap ${compactMode ? 'text-sm' : 'text-base'}`}>
                {msg.content}
              </p>
              <div className="text-xs opacity-50 mt-1 text-right">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center mt-2">
              <div className="bg-secondary/50 p-3 rounded-lg mr-12">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium">
                    {getAgentName(activeAgent)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-border">
        <form 
          className="flex items-center gap-2 max-w-4xl mx-auto"
          onSubmit={handleSubmitChat}
        >
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${getAgentName(activeAgent)}...`}
            disabled={isLoading || !isSDKConnected}
            className="flex-1"
            aria-label="Chat input"
          />
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading || !isSDKConnected}
            aria-label="Send message"
          >
            Send
          </Button>
        </form>
        
        {!isSDKConnected && (
          <div className="text-xs text-amber-500 mt-1 max-w-4xl mx-auto">
            Connecting to AI system... Some features may be limited.
          </div>
        )}
      </div>
    </main>
  );
};

export default MultiAgentChat;
