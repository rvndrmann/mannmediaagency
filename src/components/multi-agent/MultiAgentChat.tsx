
import React, { useState, useEffect, useRef } from "react";
import { useMultiAgentChat, AgentType } from "@/hooks/use-multi-agent-chat";
import { ChatMessage } from "../chat/ChatMessage";
import { UserMessageForm } from "../chat/UserMessageForm";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Cog,
  Bot,
  RefreshCw,
  Sparkles,
  Zap,
  Database,
  FileText,
  RocketIcon,
  Settings,
  Eraser,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { AgentSwitcher } from "./AgentSwitcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Message } from "@/types/message";
import { Attachment } from "@/types/message";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useAuth } from "@/hooks/use-auth";
import { ChatSessionSelector } from "./ChatSessionSelector";

interface MultiAgentChatProps {
  isEmbedded?: boolean;
  onBack?: () => void;
  projectId?: string;
  sessionId?: string;
  compactMode?: boolean;
}

export function MultiAgentChat({
  isEmbedded = false,
  onBack,
  projectId,
  sessionId,
  compactMode = false,
}: MultiAgentChatProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const { sessions, activeChatId, setActiveChatId, updateChatSession } = useChatSession();

  // Access the project context if a projectId is provided
  const projectContext = useProjectContext({
    initialProjectId: projectId,
  });

  // Get the chat hook
  const {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    activeAgent,
    handoffInProgress,
    agentInstructions,
    userCredits,
    pendingAttachments,
    setPendingAttachments,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    handleSubmit,
    switchAgent,
    clearChat,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    addAttachments,
    removeAttachment,
    updateAgentInstructions,
    getAgentInstructions,
    setProjectContext,
  } = useMultiAgentChat({
    initialMessages: [],
    projectId,
    sessionId,
  });

  // Sync messages with chat session if sessionId provided
  useEffect(() => {
    if (sessionId && sessions[sessionId]) {
      setMessages(sessions[sessionId].messages);
    }
  }, [sessionId, sessions, setMessages]);

  // Update session when messages change
  useEffect(() => {
    if (sessionId) {
      updateChatSession(sessionId, messages);
    }
  }, [messages, sessionId, updateChatSession]);

  // Set project context when projectId changes
  useEffect(() => {
    if (projectId && projectContext.projectContent) {
      setProjectContext(projectId, projectContext.projectContent);
    }
  }, [projectId, projectContext.projectContent, setProjectContext]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // File upload handler
  const handleFileUpload = (files: File[]) => {
    // Convert File objects to Attachment objects
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(2, 11),
      type: file.type,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));

    addAttachments(newAttachments);
  };

  // Get the bot name based on active agent type
  const getBotName = (agentType: AgentType): string => {
    switch (agentType) {
      case "main":
        return "Assistant";
      case "script":
        return "Script Writer";
      case "image":
        return "Image Generator";
      case "tool":
        return "Tool Specialist";
      case "scene":
        return "Scene Creator";
      case "data":
        return "Data Analyst";
      default:
        return "Assistant";
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden dark:bg-background max-h-screen">
      {!isEmbedded && (
        <div className="flex items-center justify-between px-4 py-2 border-b">
          {onBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              <h2 className="text-lg font-semibold">Chat</h2>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {projectId && (
              <div className="text-xs text-muted-foreground">
                Project: {projectContext.projectDetails?.title || projectId.substring(0, 8)}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConfig(!showConfig)}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {showConfig && !compactMode && (
          <div className="w-64 border-r p-4 overflow-y-auto flex flex-col h-full">
            <Tabs defaultValue="sessions">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sessions" className="space-y-4">
                <ChatSessionSelector 
                  onSelectSession={setActiveChatId}
                  currentSessionId={activeChatId}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Model Settings</h3>
                    <Button
                      variant={usePerformanceModel ? "default" : "outline"}
                      size="sm"
                      onClick={togglePerformanceMode}
                      className="w-full justify-start"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      {usePerformanceModel ? "Performance Mode" : "Quality Mode"}
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Tools</h3>
                    <Button
                      variant={enableDirectToolExecution ? "default" : "outline"}
                      size="sm"
                      onClick={toggleDirectToolExecution}
                      className="w-full justify-start"
                    >
                      <RocketIcon className="mr-2 h-4 w-4" />
                      {enableDirectToolExecution
                        ? "Direct Tool Execution"
                        : "Tool Confirmation"}
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Advanced</h3>
                    <Button
                      variant={tracingEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={toggleTracing}
                      className="w-full justify-start"
                    >
                      <Database className="mr-2 h-4 w-4" />
                      {tracingEnabled ? "Tracing Enabled" : "Tracing Disabled"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearChat}
                      className="w-full justify-start mt-2"
                    >
                      <Eraser className="mr-2 h-4 w-4" />
                      Clear Conversation
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Agent Selection</h3>
                    <AgentSwitcher
                      currentAgent={activeAgent}
                      onSwitchAgent={switchAgent}
                    />
                  </div>
                  
                  {userCredits && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      Available Credits: {userCredits.credits_remaining}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 mb-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">
                    How can I assist you today?
                  </h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    {projectId
                      ? "I'm here to help with your project. Ask me about creating scenes, scripts, or generating content."
                      : "I'm a multi-agent system that can help with writing, data analysis, image generation, and more."}
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  showAvatar={message.role !== "system"}
                  agentName={
                    message.agentType
                      ? getBotName(message.agentType as AgentType)
                      : undefined
                  }
                />
              ))}

              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <Separator className="my-2" />

          <div className="p-4 pt-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AgentSwitcher
                  currentAgent={activeAgent}
                  onSwitchAgent={switchAgent}
                  showLabels={!compactMode}
                  compact={compactMode}
                />
              </div>
            </div>
            <UserMessageForm
              message={input}
              setMessage={setInput}
              onSubmit={handleSubmit}
              onFileUpload={handleFileUpload}
              isLoading={isLoading}
              attachments={pendingAttachments}
              onRemoveAttachment={removeAttachment}
              placeholder={`Message ${getBotName(activeAgent)}...`}
              showSendButton={!compactMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
