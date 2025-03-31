
import React, { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, User } from "lucide-react";
import { useMCPContext } from "@/contexts/MCPContext";
import { v4 as uuidv4 } from "uuid";
import { sendChatMessage } from "@/hooks/multi-agent/api-client";
import { toast } from "sonner";
import { Message } from "@/types/message";
import { AgentType } from "@/hooks/multi-agent/runner/types";

const MultiAgentChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "system",
      content: "Welcome to Multi-Agent Chat. How can I help you today?",
      createdAt: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>("main");
  
  const { connectionStatus, reconnectToMcp } = useMCPContext();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Attempt to connect to MCP when component mounts
    if (connectionStatus !== 'connected') {
      reconnectToMcp();
    }
  }, [connectionStatus, reconnectToMcp]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: inputMessage,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    
    try {
      // Call the edge function
      const response = await sendChatMessage({
        input: inputMessage,
        agentType: activeAgent,
        conversationHistory: [...messages, userMessage],
        usePerformanceModel: false,
        runId: uuidv4(),
        groupId: uuidv4()
      });
      
      // Create assistant message from response
      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: response.content,
        createdAt: new Date().toISOString(),
        agentType: response.agentType as AgentType
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Check if there's a handoff request
      if (response.handoffRequest) {
        const targetAgent = response.handoffRequest.targetAgent as AgentType;
        setActiveAgent(targetAgent);
        
        // Add a system message about the handoff
        const handoffMessage: Message = {
          id: uuidv4(),
          role: "system",
          content: `Conversation transferred to ${getAgentName(targetAgent)}. Reason: ${response.handoffRequest.reason}`,
          createdAt: new Date().toISOString(),
          type: "handoff"
        };
        
        setMessages(prev => [...prev, handoffMessage]);
        toast.info(`Switched to ${getAgentName(targetAgent)}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
        createdAt: new Date().toISOString(),
        type: "error"
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to get a response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const getAgentName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      default: return "Assistant";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Multi-Agent Chat</h1>
        
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div 
                className={`h-3 w-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} 
              />
              <span className="capitalize">{connectionStatus}</span>
              
              {connectionStatus !== 'connected' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => reconnectToMcp()}
                  disabled={connectionStatus === 'connecting'}
                >
                  Reconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Chat</CardTitle>
              <div className="flex space-x-2">
                <select 
                  className="bg-background text-foreground px-3 py-1 rounded-md border"
                  value={activeAgent}
                  onChange={(e) => setActiveAgent(e.target.value as AgentType)}
                >
                  <option value="main">Main Assistant</option>
                  <option value="script">Script Writer</option>
                  <option value="image">Image Generator</option>
                  <option value="tool">Tool Specialist</option>
                  <option value="scene">Scene Creator</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.role === 'system'
                          ? 'bg-muted' 
                          : 'bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                        <span className="text-xs opacity-70">
                          {message.role === 'user' ? 'You' : 
                          message.role === 'system' ? 'System' :
                          message.agentType ? getAgentName(message.agentType) : 'Assistant'}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="text-xs opacity-50 mt-1 text-right">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4" />
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 bg-current rounded-full animate-bounce" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <Separator className="my-2" />
            
            <div className="relative">
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-12"
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                className="absolute right-1 top-1 h-8 w-8" 
                onClick={handleSendMessage}
                disabled={inputMessage.trim() === "" || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MultiAgentChat;
