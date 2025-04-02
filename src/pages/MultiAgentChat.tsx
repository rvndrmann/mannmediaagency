import React, { useState, useRef, useEffect, useCallback } from "react"; // Import useCallback
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, User, Zap, Trash2, Hammer, BarChartBig, Paperclip } from "lucide-react";
import { useMCPContext } from "@/contexts/MCPContext";
import { v4 as uuidv4 } from "uuid";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { toast } from "sonner";
import { Message, Attachment } from "@/types/message";
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { ProjectSelector } from "@/components/multi-agent/ProjectSelector";
import { AttachmentButton } from "@/components/multi-agent/AttachmentButton";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";

const MultiAgentChat = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [useSDK, setUseSDK] = useState<boolean>(true); // Enable SDK by default
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    isLoading,
    // activeAgent, // Removed
    userCredits,
    pendingAttachments,
    setPendingAttachments,
    // usePerformanceModel, // Removed
    // enableDirectToolExecution, // Removed
    tracingEnabled,
    handleSubmit,
    // switchAgent, // Removed
    clearChat,
    // togglePerformanceMode, // Removed
    // toggleDirectToolExecution, // Removed
    toggleTracing,
    addAttachments,
    removeAttachment
  } = useMultiAgentChat({
    initialMessages: [
      {
        id: "1",
        role: "system",
        content: "Welcome to Multi-Agent Chat. How can I help you today?",
        createdAt: new Date().toISOString()
      }
    ],
    projectId: selectedProjectId // Pass the selected project ID here
  });
  
  const { status, reconnectToMcp } = useMCPContext();
  const connectionStatus = status; // Use the status from the context

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const getAgentName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main": return "Main Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      case "data": return "Data Agent";
      default: return "Assistant";
    }
  };

  // Wrap handleProjectSelect in useCallback
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    // Optionally clear chat/thread when project changes?
    // clearChat(); // Example: Uncomment to clear chat on project change
    toast.success(`Selected project: ${projectId}`);
  }, []); // Empty dependency array means this function reference never changes

  const handleAttachmentAdd = (newAttachments: Attachment[]) => {
    addAttachments(newAttachments);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Multi-Agent Chat</h1>
        
        <div className="mb-4">
          <ProjectSelector 
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleProjectSelect}
            allowCreateNew={true}
          />
        </div>
        
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
        
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Removed Performance Mode Button */}
          
          {/* Removed Tool Agent Button */}
          
          {/* Keep Tracing Button if still needed */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tracingEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={toggleTracing}
                  className={`flex items-center gap-1 ${
                    tracingEnabled
                      ? "bg-gradient-to-r from-purple-600 to-pink-600"
                      : "border-purple-600 bg-purple-800/20 text-purple-500 hover:bg-purple-800/30"
                  }`}
                >
                  <BarChartBig className="h-4 w-4" />
                  {tracingEnabled ? "Tracing On" : "Tracing Off"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{tracingEnabled ? "Detailed interaction tracing is enabled" : "Interaction tracing is disabled"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
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
                  className="bg-red-900/50 hover:bg-red-800"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Chat
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Clear chat history</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={useSDK ? "default" : "outline"} 
                  size="sm"
                  onClick={() => {
                    setUseSDK(!useSDK);
                    toast.success(useSDK ? "SDK disabled" : "SDK enabled");
                  }}
                  className={`flex items-center gap-1 ${
                    useSDK 
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600" 
                      : "border-blue-600 bg-blue-800/20 text-blue-500 hover:bg-blue-800/30"
                  }`}
                >
                  <BarChartBig className="h-4 w-4" />
                  {useSDK ? "SDK Enabled" : "SDK Disabled"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{useSDK ? "Using OpenAI Agents SDK" : "Using custom agent infrastructure"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Chat</CardTitle>
              {/* Removed Agent Selector Dropdown */}
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
                          message.role === 'system' ? 'System' : 'Assistant'}
                          {/* Simplified agent name display */}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2">
                          <AttachmentPreview 
                            attachments={message.attachments} 
                            isRemovable={false}
                          />
                        </div>
                      )}
                      
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
            
            {pendingAttachments.length > 0 && (
              <div className="mb-2">
                <AttachmentPreview 
                  attachments={pendingAttachments} 
                  onRemove={removeAttachment}
                  isRemovable={true}
                />
              </div>
            )}
            
            <Separator className="my-2" />
            
            <div className="relative">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-24"
                disabled={isLoading}
              />
              <div className="absolute right-1 top-1 flex space-x-1">
                <AttachmentButton 
                  onAttach={handleAttachmentAdd}
                  isDisabled={isLoading}
                  size="icon"
                  variant="ghost"
                />
                <Button 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => handleSubmit()}
                  disabled={input.trim() === "" && pendingAttachments.length === 0 || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-1 text-[10px] text-gray-500 flex justify-between">
              <div>
                Credits: {userCredits?.credits_remaining.toFixed(2) || "0.00"} (0.07 per message)
              </div>
              <div className="flex justify-end gap-2">
                {/* Removed Model Display */}
                {/* Removed Tool Access Display */}
                {/* Keep SDK Toggle Display if needed */}
                <div>
                  SDK: {useSDK ? "Enabled" : "Disabled"}
                </div>
                <div>
                  Tracing: {tracingEnabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MultiAgentChat;
