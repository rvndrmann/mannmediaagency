
import { useEffect, useState, useRef, useCallback } from "react";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Message } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";
import { AgentSelector } from "./AgentSelector";
import { HandoffIndicator } from "./HandoffIndicator";
import { ConnectionErrorAlert } from "@/components/ui/ConnectionErrorAlert";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { FileAttachmentButton } from "./FileAttachmentButton";
import { AttachmentPreview } from "./AttachmentPreview";
import { ProjectSelector } from "./ProjectSelector";
import { ScrollArea, ScrollAreaRef } from "@/components/ui/scroll-area";
import { getAgentName } from "@/lib/agent-icons";
import { Button } from "@/components/ui/button";
import { PlusCircle, History } from "lucide-react";
import { showToast } from "@/utils/toast-utils";
import { ChatSessionSelector } from "./ChatSessionSelector";
import { MessageProcessor } from "@/utils/message-processor";

const ChatHeader = ({ 
  projectContext, 
  onStartNewChat, 
  onShowChatSelector 
}: { 
  projectContext: any; 
  onStartNewChat: () => void; 
  onShowChatSelector: () => void; 
}) => {
  return (
    <div className="p-3 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900">
      <h3 className="font-medium text-sm">
        {projectContext?.title ? `Project: ${projectContext.title}` : 'AI Chat'}
      </h3>
      <div className="flex gap-2">
        <Button 
          onClick={onStartNewChat}
          variant="ghost"
          size="sm"
          className="text-xs flex items-center gap-1"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          New Chat
        </Button>
        <Button 
          onClick={onShowChatSelector}
          variant="ghost"
          size="sm"
          className="text-xs flex items-center gap-1"
        >
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </div>
    </div>
  );
};

const MultiAgentChat = ({
  projectId,
  onBack,
  isEmbedded = false,
  sessionId,
  compactMode = false
}: {
  projectId?: string;
  onBack?: () => void;
  isEmbedded?: boolean;
  sessionId?: string;
  compactMode?: boolean;
}) => {
  const [input, setInput] = useState('');
  const [showChatSelector, setShowChatSelector] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [messageProcessor] = useState<MessageProcessor>(() => new MessageProcessor());
  
  const scrollAreaRef = useRef<HTMLDivElement & ScrollAreaRef>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialRenderRef = useRef<boolean>(true);
  
  const {
    messages,
    isLoading,
    handoffInProgress,
    activeAgent,
    setActiveAgent,
    pendingAttachments,
    addAttachments,
    removeAttachment,
    handleSubmit: agentHandleSubmit,
    sendMessage,
    clearMessages,
    processHandoff
  } = useMultiAgentChat({
    initialMessages: [],
    projectId,
    sessionId
  });
  
  const { 
    activeProjectId: projectContextId,
    projectDetails: projectContext,
    isLoading: isContextLoading,
    setActiveProject: setProjectId,
  } = useProjectContext();
  
  const { 
    chatSessions, 
    activeChatId,
    setActiveChatId,
    getOrCreateChatSession,
    updateChatSession,
    createChatSession
  } = useChatSession();
  
  // Improved scroll to bottom function with debouncing
  const scrollToBottom = useCallback(() => {
    // Clear any existing timeout to prevent multiple calls
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a small timeout to ensure DOM has updated
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollAreaRef.current?.scrollToBottom) {
        console.log("Executing scrollToBottom");
        scrollAreaRef.current.scrollToBottom();
        
        // Double-check scroll position
        const checkTimeout = setTimeout(() => {
          scrollAreaRef.current?.scrollToBottom?.();
        }, 100);
        
        return () => clearTimeout(checkTimeout);
      } else {
        console.warn("ScrollArea ref missing scrollToBottom method");
      }
    }, 50);
  }, []);
  
  // Handle message updates
  useEffect(() => {
    // Initialize message processor handler
    messageProcessor.setMessageHandler((newMessages) => {
      if (newMessages.length > 0) {
        console.log(`Processing ${newMessages.length} new messages`);
        scrollToBottom();
      }
    });
    
    // Clean up scroll timeouts on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scrollToBottom, messageProcessor]);
  
  // Monitor messages for changes and scroll
  useEffect(() => {
    // Only scroll on updates after initial render
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      scrollToBottom();
    } else if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);
  
  // When loading status changes, ensure we scroll to show loading indicator
  useEffect(() => {
    if (isLoading) {
      scrollToBottom();
      
      // Set up periodic scrolling during loading
      const interval = setInterval(() => {
        scrollToBottom();
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [isLoading, scrollToBottom]);
  
  useEffect(() => {
    if (projectId) {
      console.log("Initializing chat session for project:", projectId);
      getOrCreateChatSession(projectId);
    } else {
      console.log("Initializing default chat session");
      getOrCreateChatSession(null);
    }
  }, [projectId, getOrCreateChatSession]);
  
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase
          .from('canvas_projects')
          .select('count')
          .limit(1);
        
        if (error) {
          setConnectionError("Connection to the server may be unstable.");
        } else {
          setConnectionError(null);
        }
      } catch (error) {
        console.error("Connection check failed:", error);
        setConnectionError("Connection to the server failed.");
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const startNewChat = () => {
    clearMessages();
    createChatSession(projectId);
    showToast.info("Started a new chat");
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && (!pendingAttachments || pendingAttachments.length === 0)) return;
    
    if (sendMessage) {
      console.log("Sending message:", input);
      sendMessage(input);
      setInput("");
      
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      
      scrollToBottom();
      
      const timeout = setTimeout(() => {
        scrollToBottom();
      }, 300);
      
      setProcessingTimeout(timeout);
    } else {
      console.log("Using agent handle submit");
      agentHandleSubmit(e);
      setInput("");
      
      setTimeout(scrollToBottom, 300);
    }
  };
  
  useEffect(() => {
    // Clean up the timeout when component unmounts
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [processingTimeout]);
  
  const isContextLoaded = !isContextLoading && !!projectContext;
  
  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-950">
      <ChatHeader 
        projectContext={projectContext} 
        onStartNewChat={startNewChat}
        onShowChatSelector={() => setShowChatSelector(true)}
      />
      
      {showChatSelector && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-slate-950">
          <ChatSessionSelector 
            onClose={() => setShowChatSelector(false)}
            onSelectSession={(id) => {
              console.log("Selected chat session:", id);
              setActiveChatId(id);
              setShowChatSelector(false);
            }}
          />
        </div>
      )}
      
      <div className="flex flex-col flex-1 overflow-hidden h-full relative">
        <ConnectionErrorAlert 
          errorMessage={connectionError} 
          onRetry={async () => {
            try {
              const { error } = await supabase
                .from('canvas_projects')
                .select('count')
                .limit(1);
              
              if (!error) {
                setConnectionError(null);
              }
            } catch (error) {
              console.error("Retry connection check failed:", error);
            }
          }} 
        />
        
        <ScrollArea 
          className="flex-1" 
          ref={scrollAreaRef}
        >
          <div className="p-4 space-y-4" id="messages-container">
            {Array.isArray(messages) && messages.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <p>Start a conversation with the AI assistant.</p>
              </div>
            )}
            
            {Array.isArray(messages) && messages.length > 0 && 
              messages.map((message, index) => (
                <ChatMessage 
                  key={`${message.id || index}`} 
                  message={message} 
                  showAgentName={message.role === 'assistant'}
                  onEditContent={(type, content, sceneId) => {
                    console.log("Edit content", type, content, sceneId);
                  }}
                />
              ))
            }
            
            {handoffInProgress && (
              <HandoffIndicator
                fromAgent="main"
                toAgent={activeAgent}
                onCancel={() => processHandoff("main", activeAgent, "User canceled")}
                visible={handoffInProgress}
              />
            )}
            
            {isLoading && (
              <ChatMessage
                message={{
                  id: 'loading-' + new Date().getTime(),
                  role: 'assistant',
                  content: '',
                  createdAt: new Date().toISOString(),
                  status: "thinking"
                }}
                showAgentName={true}
              />
            )}
            
            <div id="messages-end" style={{ height: "40px" }} />
          </div>
        </ScrollArea>
        
        {Array.isArray(pendingAttachments) && pendingAttachments.length > 0 && (
          <div className="p-2 border-t">
            <AttachmentPreview
              attachments={pendingAttachments}
              onRemove={removeAttachment}
            />
          </div>
        )}
        
        <div className="border-t p-4 mt-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <AgentSelector
                selectedAgentId={activeAgent}
                onSelect={setActiveAgent}
              />
              
              <ProjectSelector 
                selectedProjectId={projectContextId}
                onProjectSelect={setProjectId}
                compact={true}
              />
            </div>
            
            <FileAttachmentButton
              onAttach={addAttachments}
              disabled={isLoading || handoffInProgress}
            />
          </div>
          
          <ChatInput
            input={input}
            onInputChange={setInput}
            onSubmit={handleSendMessage}
            disabled={isLoading || handoffInProgress}
            isLoading={isLoading}
            placeholder={
              handoffInProgress
                ? "Handoff in progress..."
                : `Message ${getAgentName(activeAgent)} agent...`
            }
          />
        </div>
      </div>
    </div>
  );
};

export default MultiAgentChat;
