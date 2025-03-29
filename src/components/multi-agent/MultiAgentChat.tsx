import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Message, MessageStatus } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";
import { AgentSelector } from "./AgentSelector";
import { HandoffIndicator } from "./HandoffIndicator";
import { ConnectionErrorAlert } from "@/components/ui/ConnectionErrorAlert";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { FileAttachmentButton } from "./FileAttachmentButton";
import { AttachmentPreview } from "./AttachmentPreview";
import { ProjectSelector } from "./ProjectSelector";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatSessionSelector } from "./ChatSessionSelector";

const MultiAgentChat = () => {
  const {
    messages,
    sending,
    handoffActive,
    handoffInfo,
    activeAgent,
    agents,
    onSendMessage,
    setActiveAgent,
    attachments,
    setAttachments,
    cancelAttachment,
    toolCallInProgress,
    lastToolCall,
    clearMessages,
    currentTrace,
    resetHandoff
  } = useMultiAgentChat();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showChatSelector, setShowChatSelector] = useState(false);
  
  const { 
    projectContext,
    isContextLoaded,
    projectId,
    sceneId,
    setProjectId,
    setSceneId,
    clearProjectContext
  } = useProjectContext();
  
  const { 
    chatSessions, 
    activeChatId,
    setActiveChatId,
    getOrCreateChatSession,
    updateChatSession,
    createChatSession
  } = useChatSession();
  
  useEffect(() => {
    // Initialize or get chat session when component mounts
    if (projectId) {
      getOrCreateChatSession(projectId);
    } else {
      // This is a general chat, not tied to a project
      getOrCreateChatSession(null);
    }
  }, [projectId, getOrCreateChatSession]);
  
  useEffect(() => {
    // Update chat session when messages change
    if (activeChatId && messages.length > 0) {
      updateChatSession(activeChatId, messages);
    }
  }, [messages, activeChatId, updateChatSession]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Check connection status periodically
  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await pingServer();
      if (error) {
        setConnectionError("Connection to the server may be unstable. Some features might not work properly.");
      } else {
        setConnectionError(null);
      }
    };
    
    // Check on mount
    checkConnection();
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const pingServer = async () => {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('count')
        .limit(1)
        .then(result => result);
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Connection check failed:", error);
      return { data: null, error };
    }
  };
  
  const startNewChat = () => {
    clearMessages();
    createChatSession(projectId);
  };
  
  const handleSendMessage = async (content: string) => {
    if (content.trim() === '') return;
    
    await onSendMessage(content);
  };
  
  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <ChatHeader 
        projectContext={projectContext} 
        isContextLoaded={isContextLoaded}
        onStartNewChat={startNewChat}
        onShowChatSelector={() => setShowChatSelector(true)}
      />
      
      <Suspense fallback={<div className="p-4 text-center">Loading chat...</div>}>
        {showChatSelector && (
          <ChatSessionSelector 
            onClose={() => setShowChatSelector(false)}
            onSelect={(id) => {
              setActiveChatId(id);
              setShowChatSelector(false);
            }}
          />
        )}
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <ConnectionErrorAlert 
            errorMessage={connectionError} 
            onRetry={async () => {
              const { error } = await pingServer();
              if (!error) {
                setConnectionError(null);
              }
            }} 
          />
          
          <ScrollArea className="flex-1">
            <div className="flex-1 p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Start a conversation with the AI assistant.</p>
                  {!projectId && (
                    <div className="mt-8">
                      <ProjectSelector 
                        title="Select a project context (optional):"
                        selectedProjectId={projectId}
                        onSelectProject={(id) => setProjectId(id)}
                        onSelectScene={(projectId, sceneId) => {
                          setProjectId(projectId);
                          setSceneId(sceneId);
                        }}
                        showScenes
                      />
                    </div>
                  )}
                </div>
              )}
              
              {messages.map((message, index) => (
                <ChatMessage 
                  key={message.id || index} 
                  message={message} 
                  showAgentName={message.role === 'assistant'}
                  toolCall={lastToolCall && lastToolCall.messageId === message.id ? lastToolCall : undefined}
                />
              ))}
              
              {handoffActive && handoffInfo && (
                <HandoffIndicator
                  handoffInfo={handoffInfo}
                  onCancel={resetHandoff}
                />
              )}
              
              {sending && (
                <ChatMessage
                  message={{
                    id: 'sending',
                    role: 'assistant',
                    content: '',
                    agentName: activeAgent,
                    status: MessageStatus.THINKING
                  }}
                  showAgentName={true}
                />
              )}
              
              {toolCallInProgress && (
                <ChatMessage
                  message={{
                    id: 'tool-call',
                    role: 'assistant',
                    content: `Using tool: ${toolCallInProgress.name}`,
                    status: MessageStatus.TOOL_CALL
                  }}
                  showAgentName={false}
                />
              )}
              
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          
          {attachments.length > 0 && (
            <div className="p-2 border-t">
              <AttachmentPreview
                attachments={attachments}
                onRemove={cancelAttachment}
              />
            </div>
          )}
          
          <div className="border-t p-4">
            <div className="flex items-center justify-between mb-2">
              <AgentSelector
                agents={agents}
                activeAgent={activeAgent}
                onSelect={setActiveAgent}
                disabled={sending || handoffActive}
              />
              
              <FileAttachmentButton
                onFileSelected={setAttachments}
                disabled={sending || handoffActive}
              />
            </div>
            
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={sending || handoffActive}
              placeholder={
                handoffActive
                  ? "Handoff in progress..."
                  : `Message ${activeAgent} agent...`
              }
            />
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default MultiAgentChat;
