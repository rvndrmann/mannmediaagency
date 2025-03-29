
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { ChatInput } from "@/components/chat/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { AgentSelector } from "./AgentSelector";
import { ProjectSelector } from "./ProjectSelector";
import { FileAttachmentButton } from "./FileAttachmentButton";
import { AttachmentPreview } from "./AttachmentPreview";
import { Button } from "@/components/ui/button";
import { Zap, Trash2, Hammer, BarChartBig, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { AgentInstructionsTable } from "./AgentInstructionsTable";
import { EditAgentInstructionsDialog } from "./EditAgentInstructionsDialog";
import { HandoffIndicator } from "./HandoffIndicator";
import { ChatSessionSelector } from "./ChatSessionSelector";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { AgentType } from "@/hooks/use-multi-agent-chat";
import type { Message } from "@/types/message";

// Import the CompactAgentSelector component using lazy loading
const CompactAgentSelector = lazy(() => import('../canvas/CompactAgentSelector').then(module => ({
  default: module.CompactAgentSelector
})));

interface MultiAgentChatProps {
  projectId?: string;
  onBack?: () => void;
  isEmbedded?: boolean;
  sessionId?: string;
  compactMode?: boolean;
}

export const MultiAgentChat = ({ 
  projectId, 
  onBack, 
  isEmbedded = false,
  sessionId,
  compactMode = false
}: MultiAgentChatProps) => {
  const navigate = useNavigate();
  const {
    activeProjectId,
    projectDetails,
    isLoading: projectLoading,
    setActiveProject
  } = useProjectContext({ initialProjectId: projectId });
  
  const { activeChatId, getOrCreateChatSession } = useChatSession();
  
  const [localSessionId, setLocalSessionId] = useState<string | null>(
    sessionId || activeChatId
  );
  
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    if (!localSessionId && projectId) {
      try {
        const newSessionId = getOrCreateChatSession(projectId, [
          {
            id: "welcome",
            role: "system",
            content: `Welcome to Canvas Assistant. I'm here to help with your video project${projectId ? " #" + projectId : ""}. Ask me to write scripts, create scene descriptions, or generate image prompts for your scenes.`,
            createdAt: new Date().toISOString(),
          }
        ]);
        setLocalSessionId(newSessionId);
      } catch (error) {
        console.error("Error creating chat session:", error);
        setConnectionError("Failed to create chat session. Please try refreshing the page.");
      }
    } else if (!localSessionId && !projectId) {
      try {
        const newSessionId = getOrCreateChatSession(null);
        setLocalSessionId(newSessionId);
      } catch (error) {
        console.error("Error creating general chat session:", error);
        setConnectionError("Failed to create chat session. Please try refreshing the page.");
      }
    }
  }, [projectId, localSessionId, getOrCreateChatSession]);
  
  const { 
    messages, 
    setMessages,
    input, 
    setInput, 
    isLoading, 
    activeAgent,
    userCredits, 
    pendingAttachments,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    handoffInProgress,
    agentInstructions,
    handleSubmit: originalHandleSubmit, 
    switchAgent, 
    clearChat,
    addAttachments,
    removeAttachment,
    updateAgentInstructions,
    getAgentInstructions,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    setProjectContext
  } = useMultiAgentChat({
    projectId: activeProjectId || undefined,
    sessionId: localSessionId || undefined
  });

  // Enhanced handleSubmit with error handling and retry capability
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionError(null);
    
    try {
      await originalHandleSubmit(e);
      // Reset retry count on successful submission
      setRetryCount(0);
    } catch (error) {
      console.error("Error in chat submission:", error);
      
      // Handle response based on retry count
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        toast.error(`Chat submission failed. Retrying (${retryCount + 1}/3)...`);
        
        // Retry after a short delay with exponential backoff
        setTimeout(() => {
          originalHandleSubmit(e).catch(retryErr => {
            console.error("Retry failed:", retryErr);
            setConnectionError("Connection issues detected. Please check your internet connection and try again.");
          });
        }, 1000 * Math.pow(2, retryCount));
      } else {
        setConnectionError("Multiple attempts to send your message failed. Please check your internet connection or try again later.");
        toast.error("Chat submission failed after multiple attempts");
      }
    }
  }, [originalHandleSubmit, retryCount]);
  
  const [showInstructions, setShowInstructions] = useState(false);
  const [editInstructionsOpen, setEditInstructionsOpen] = useState(false);
  const [selectedAgentForEdit, setSelectedAgentForEdit] = useState<AgentType>("main");
  const [fromAgent, setFromAgent] = useState<AgentType>("main");
  const [toAgent, setToAgent] = useState<AgentType>("main");
  
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
  
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.handoffRequest && lastMessage.agentType) {
        setFromAgent(lastMessage.agentType as AgentType);
        setToAgent(lastMessage.handoffRequest.targetAgent as AgentType);
      }
    }
  }, [messages]);

  // Set up ping to check for connection issues
  useEffect(() => {
    const pingServer = async () => {
      try {
        // Simple ping to check if Supabase is reachable
        const { data, error } = await supabase.from('canvas_projects').select('count').limit(1);
        if (error) throw error;
        
        // If we get here, connection is good
        setConnectionError(null);
      } catch (error) {
        console.error("Connection check failed:", error);
        // Only set error if not already set
        if (!connectionError) {
          setConnectionError("Connection to the server may be unstable. Some features might not work properly.");
        }
      }
    };
    
    // Run ping immediately and then every 30 seconds
    pingServer();
    const interval = setInterval(pingServer, 30000);
    
    return () => clearInterval(interval);
  }, [connectionError]);

  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };
  
  const openEditInstructions = (agentType: AgentType) => {
    setSelectedAgentForEdit(agentType);
    setEditInstructionsOpen(true);
  };
  
  const handleSaveInstructions = (agentType: AgentType, instructions: string) => {
    updateAgentInstructions(agentType, instructions);
  };
  
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/");
    }
  };
  
  const handleProjectSelect = (projectId: string) => {
    if (projectId) {
      setActiveProject(projectId);
      toast.success("Switched to project");
      
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: "system",
        content: `Switched to Canvas project: ${projectDetails?.title || projectId}`,
        createdAt: new Date().toISOString(),
        type: "system"
      };
      
      if (messages && Array.isArray(messages)) {
        setMessages(prevMessages => [...prevMessages, systemMessage]);
      }
    }
  };

  const handleViewTraces = useCallback(() => {
    navigate('/trace-analytics');
  }, [navigate]);
  
  const handleRetryConnection = () => {
    setConnectionError(null);
    setRetryCount(0);
    toast.info("Retrying connection...");
    // Add a "fake" system message to show the user something is happening
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      role: "system",
      content: "Reconnecting to server...",
      createdAt: new Date().toISOString(),
      type: "system",
      status: "working"
    };
    
    if (messages && Array.isArray(messages)) {
      setMessages(prevMessages => [...prevMessages, systemMessage]);
    }
    
    // Try to ping the server
    supabase.from('canvas_projects').select('count').limit(1)
      .then(() => {
        // Update the message to show success
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === systemMessage.id 
              ? {...msg, content: "Connection restored!", status: "completed"} 
              : msg
          )
        );
        toast.success("Connection restored!");
      })
      .catch(err => {
        console.error("Connection retry failed:", err);
        // Update the message to show failure
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === systemMessage.id 
              ? {...msg, content: "Connection failed. Please try again later.", status: "error"} 
              : msg
          )
        );
        setConnectionError("Unable to connect to the server. Please check your internet connection and try again.");
        toast.error("Connection failed");
      });
  };

  return (
    <div className={`flex flex-col ${isEmbedded ? 'h-full' : 'h-screen'} bg-gradient-to-b from-[#1A1F29] to-[#121827]`}>
      {!compactMode && (
        <header className="p-2 flex items-center justify-between bg-[#1A1F29]/80 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBackClick}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-white">AI Multi-Agent Chat</h1>
              <p className="text-xs text-gray-400">
                {activeProjectId ? `Connected to Canvas Project: ${projectDetails?.title || activeProjectId}` : "Interact with specialized AI agents"}
              </p>
            </div>
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
            
            {tracingEnabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewTraces}
                      className="border-blue-600 bg-blue-800/20 text-blue-400 hover:bg-blue-800/30 text-xs h-6 px-2"
                    >
                      <BarChartBig className="h-3 w-3 mr-1" />
                      View Traces
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#2D3240] border-[#434759] text-white">
                    <p className="text-xs">View detailed analytics of your agent interactions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
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
      )}
      
      <div className={`flex-1 ${compactMode ? '' : 'container mx-auto max-w-4xl px-4 pb-2 pt-2'} flex flex-col h-full overflow-hidden`}>
        {!compactMode && (
          <div className="mb-2 space-y-2">
            {!isEmbedded && (
              <ChatSessionSelector />
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <AgentSelector selectedAgentId={activeAgent} onSelect={switchAgent} />
              <ProjectSelector 
                selectedProjectId={activeProjectId || undefined} 
                onProjectSelect={handleProjectSelect}
                allowCreateNew={true}
              />
            </div>
          </div>
        )}
        
        {compactMode && (
          <div className="compact-agent-selector">
            <Suspense fallback={<div className="p-2 text-center text-xs text-gray-400">Loading agent selector...</div>}>
              <CompactAgentSelector selectedAgent={activeAgent} onSelect={switchAgent} />
            </Suspense>
          </div>
        )}
        
        {showInstructions && !compactMode && 
          <AgentInstructionsTable 
            activeAgent={activeAgent} 
            agentInstructions={agentInstructions}
            onEditInstructions={openEditInstructions}
          />
        }
        
        {connectionError && (
          <Alert variant="destructive" className="mb-2 bg-red-900/40 border-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              <span>{connectionError}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryConnection}
                className="ml-2 text-xs border-red-700 bg-red-900/50 hover:bg-red-800/70"
              >
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className={`flex-1 flex flex-col overflow-hidden bg-[#21283B]/60 backdrop-blur-sm rounded-${compactMode ? 'none' : 'xl'} border ${compactMode ? 'border-t border-b' : 'border'} border-white/10 shadow-lg`}>
          {messages && messages.length > 0 ? (
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
                {activeProjectId 
                  ? "Connected to your Canvas project. Ask me to write scripts, create scene descriptions, or generate image prompts." 
                  : "Choose an agent type above and start chatting. Each agent specializes in different tasks - use the main assistant for general help, or select a specialized agent for specific needs."}
              </p>
            </div>
          )}
        </div>
        
        <div className={`mt-2 bg-[#21283B]/40 backdrop-blur-sm ${compactMode ? 'rounded-none' : 'rounded-xl'} border border-white/10 p-2`}>
          {pendingAttachments && pendingAttachments.length > 0 && (
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
                placeholder={
                  connectionError 
                    ? "Connection issues detected. Messages may not be delivered." 
                    : `Ask ${activeAgent} agent a question...`
                }
              />
            </div>
            
            <div className="flex-shrink-0 flex items-end mb-1.5 mr-1.5">
              <FileAttachmentButton onAttach={addAttachments} />
            </div>
          </div>
          
          {!compactMode && (
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
          )}
        </div>
      </div>
      
      <HandoffIndicator 
        fromAgent={fromAgent} 
        toAgent={toAgent} 
        visible={handoffInProgress}
      />
      
      <EditAgentInstructionsDialog
        open={editInstructionsOpen}
        onOpenChange={setEditInstructionsOpen}
        agentType={selectedAgentForEdit}
        initialInstructions={getAgentInstructions(selectedAgentForEdit)}
        onSave={handleSaveInstructions}
      />
    </div>
  );
};

export default MultiAgentChat;
