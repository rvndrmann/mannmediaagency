
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, User, Zap, Trash2, Hammer, BarChartBig, Paperclip, ArrowLeft, LayoutGrid, ExternalLink, Edit3, Info } from "lucide-react";
import { useMCPContext } from "@/contexts/MCPContext";
import { MCPServerService } from "@/services/mcpService";
import { v4 as uuidv4 } from "uuid";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { useCanvasProjects } from "@/hooks/use-canvas-projects";
import { toast } from "sonner";
import { Message, Attachment } from "@/types/message";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { ProjectSelector } from "@/components/multi-agent/ProjectSelector";
import { AttachmentButton } from "@/components/multi-agent/AttachmentButton";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";
import { CanvasMcpProvider } from "@/contexts/CanvasMcpContext";

interface MultiAgentChatProps {
  sceneId?: string;
  isEmbedded?: boolean;
  compactMode?: boolean;
  onBack?: () => void;
  sessionId?: string;
  onAgentCommand?: (command: any) => void;
}

const MultiAgentChat: React.FC<MultiAgentChatProps> = ({ sceneId }) => {
  console.log("MultiAgentChat component rendering");
  const navigate = useNavigate();
  console.log("useNavigate initialized");
  const { projectId: projectIdFromUrl } = useParams<{ projectId?: string }>();
  console.log("useParams initialized", projectIdFromUrl);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectIdFromUrl);
  const [useSDK, setUseSDK] = useState<boolean>(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    messages, setMessages,
    input,
    setInput,
    isLoading,
    userCredits,
    pendingAttachments,
    setPendingAttachments,
    tracingEnabled,
    handleSubmit,
    clearChat,
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
    projectId: selectedProjectId,
    sceneId: sceneId
  });
  
  const { status, reconnectToMcp } = useMCPContext();
  const connectionStatus = status;

  const { projects: allProjects, loading: projectsLoading } = useCanvasProjects();

  const currentProject = useMemo(() => {
    if (!selectedProjectId || !allProjects) return null;
    return allProjects.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, allProjects]);

  const canvasAgent = useCanvasAgent({
    projectId: selectedProjectId,
    project: currentProject,
    projects: allProjects,
  });

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 0);

    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (connectionStatus !== 'connected') {
      reconnectToMcp();
    }
  }, [connectionStatus, reconnectToMcp]);

  useEffect(() => {
    if (selectedProjectId) {
      const mcpService = new MCPServerService(typeof process !== 'undefined' ? process.env.REACT_APP_MCP_URL || "" : "", selectedProjectId);

      const handleMCPMessage = (event: MessageEvent, setMessagesFunc: React.Dispatch<React.SetStateAction<Message[]>>) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'scene_update' && data.sceneId && data.field && data.value) {
            const updateMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: `Admin updated scene ${data.sceneId}: Field '${data.field}' changed.`,
              createdAt: new Date().toISOString(),
              projectId: selectedProjectId,
            };
            console.log("Adding scene update message to chat:", updateMessage);
            setMessagesFunc(prev => [...prev, updateMessage]);

            toast.success(`Scene ${data.sceneId} updated: ${data.field}`);
          } else if (data.type === 'admin_message' && data.content) {
             const adminChatMessage: Message = {
               id: uuidv4(),
               role: 'assistant',
               content: data.content,
               createdAt: new Date().toISOString(),
               projectId: selectedProjectId,
               senderName: 'Admin',
               attachments: data.attachments || undefined,
             };
             console.log("Adding admin message to chat:", adminChatMessage);
             setMessagesFunc(prev => [...prev, adminChatMessage]);
             toast.info("Received a message from Admin.");
          }
        } catch (error) {
          console.error("Error parsing MCP message:", error);
        }
      };

      const connectToMCPStream = async (setMessagesFunc: React.Dispatch<React.SetStateAction<Message[]>>) => {
        try {
          await mcpService.connect();
          const eventSource = new EventSource(`${process.env.REACT_APP_MCP_URL}/stream?projectId=${selectedProjectId}`);

          eventSource.onmessage = (event) => handleMCPMessage(event, setMessages);
          eventSource.onerror = (error) => {
            console.error("SSE error:", error);
            toast.error("Error connecting to MCP stream");
          };

          return () => {
            eventSource.close();
            mcpService.disconnect();
          };
        } catch (error) {
          console.error("Error connecting to MCP:", error);
          toast.error("Failed to connect to MCP");
          return () => {};
        }
      };

      let cleanup = connectToMCPStream(setMessages);

      return () => {
        cleanup.then(cleanupFn => cleanupFn());
      };
    }
  }, [selectedProjectId, setMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    navigate(`/multi-agent-chat/${projectId}`, { replace: true });
    toast.success(`Selected project: ${projectId}`);
  }, [navigate]);

  const handleAttachmentAdd = (newAttachments: Attachment[]) => {
    addAttachments(newAttachments);
  };

  useEffect(() => {
    if (!projectIdFromUrl && !selectedProjectId) {
      console.log("No project ID in URL or state, redirecting to /canvas");
      toast.info("Please select a project first.");
      navigate('/canvas', { replace: true });
    } else if (projectIdFromUrl && projectIdFromUrl !== selectedProjectId) {
      console.log(`Syncing selectedProjectId from URL: ${projectIdFromUrl}`);
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl, selectedProjectId, navigate]);

  const handleEditSceneScript = useCallback((sceneId: string) => {
    const newScript = prompt(`Enter new script for Scene ${sceneId}:`);
    if (newScript !== null) {
      canvasAgent.updateSceneScript(sceneId, newScript)
        .then(success => {
          if (success) toast.success(`Script for scene ${sceneId} update requested.`);
        })
        .catch(err => toast.error(`Failed to update script: ${err.message}`));
    }
  }, [canvasAgent]);

  const handleEditSceneVoiceover = useCallback((sceneId: string) => {
    const newVoiceover = prompt(`Enter new voiceover text for Scene ${sceneId}:`);
    if (newVoiceover !== null) {
      canvasAgent.updateSceneVoiceover(sceneId, newVoiceover)
        .then(success => {
          if (success) toast.success(`Voiceover for scene ${sceneId} update requested.`);
        })
        .catch(err => toast.error(`Failed to update voiceover: ${err.message}`));
    }
  }, [canvasAgent]);

  const handleEditSceneImagePrompt = useCallback((sceneId: string) => {
    const newPrompt = prompt(`Enter new image prompt for Scene ${sceneId}:`);
    if (newPrompt !== null) {
      canvasAgent.updateSceneImagePrompt(sceneId, newPrompt)
        .then(success => {
          if (success) toast.success(`Image prompt for scene ${sceneId} update requested.`);
        })
        .catch(err => toast.error(`Failed to update image prompt: ${err.message}`));
    }
  }, [canvasAgent]);

  const handleEditSceneDescription = useCallback((sceneId: string) => {
    const newDescription = prompt(`Enter new description for Scene ${sceneId}:`);
    if (newDescription !== null) {
      canvasAgent.updateSceneDescription(sceneId, newDescription)
        .then(success => {
          if (success) toast.success(`Description for scene ${sceneId} update requested.`);
        })
        .catch(err => toast.error(`Failed to update description: ${err.message}`));
    }
  }, [canvasAgent]);

  return (
    <>
    <CanvasMcpProvider projectId={selectedProjectId}>
      <Layout>
      <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
             <Button variant="outline" size="icon" onClick={() => navigate(-1)} title="Go Back">
               <ArrowLeft className="h-4 w-4" />
             </Button>
             <h1 className="text-3xl font-bold">Multi-Agent Chat</h1>
          </div>
          <Link to="/canvas">
             <Button variant="outline" size="sm">
               <LayoutGrid className="mr-2 h-4 w-4" /> Go to Canvas
             </Button>
          </Link>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleProjectSelect}
              allowCreateNew={true}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!selectedProjectId}
                    onClick={() => {
                      console.log(`[Open Canvas Button] Clicked!`);
                      console.log(`[Open Canvas Button] selectedProjectId: ${selectedProjectId}`);
                      if (selectedProjectId) {
                        const targetPath = `/canvas/${selectedProjectId}`;
                        console.log(`[Open Canvas Button] Navigating to: ${targetPath}`);
                        navigate(targetPath);
                      } else {
                        console.log(`[Open Canvas Button] Navigation skipped: No project selected.`);
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{selectedProjectId ? "Open selected project in Canvas" : "Select a project to open in Canvas"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-grow justify-end">
            <div className="flex items-center space-x-2 p-2 rounded border bg-card text-card-foreground text-sm">
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
                  className="ml-2 h-6 px-2"
                >
                  Reconnect
                </Button>
              )}
            </div>
        
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
        </div>

        <div className="flex-1 flex flex-col overflow-hidden border rounded-lg relative">
          <div className="p-4 border-b">
             <h3 className="font-semibold">Chat</h3>
          </div>
          <ScrollArea className="p-4 min-h-0 pb-[130px]" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                 <ChatMessage
                   key={message.id}
                   message={message}
                   showAgentLabel={true}
                   onEditSceneScript={handleEditSceneScript}
                   onEditSceneVoiceover={handleEditSceneVoiceover}
                   onEditSceneImagePrompt={handleEditSceneImagePrompt}
                   onEditSceneDescription={handleEditSceneDescription}
                 />
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
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card">
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
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
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
          
            <div className="mt-2 text-[10px] text-gray-500 flex justify-between items-center">
              <div>
                Credits: {userCredits?.credits_remaining?.toFixed(2) || "0.00"} (0.07 per message)
              </div>
              <div className="flex items-center gap-2">
                <div>
                  SDK: {useSDK ? "Enabled" : "Disabled"}
                </div>
                <div>
                  Tracing: {tracingEnabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </Layout>
    </CanvasMcpProvider>
    </>
  );
};

console.log("MultiAgentChat component defined");
export default MultiAgentChat;
