
import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ChatSessionSelector } from "./ChatSessionSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormEvent } from "react";
import { getAgentName } from "@/lib/agent-icons";

const ChatHeader = ({ 
  projectContext, 
  isContextLoaded, 
  onStartNewChat, 
  onShowChatSelector 
}: { 
  projectContext: any; 
  isContextLoaded: boolean; 
  onStartNewChat: () => void; 
  onShowChatSelector: () => void; 
}) => {
  return (
    <div className="p-2 border-b flex justify-between items-center">
      <h3 className="font-medium">
        {projectContext?.title ? `Project: ${projectContext.title}` : 'AI Chat'}
      </h3>
      <div className="flex gap-2">
        <button 
          onClick={onStartNewChat}
          className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200"
        >
          New Chat
        </button>
        <button 
          onClick={onShowChatSelector}
          className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200"
        >
          History
        </button>
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
  const {
    messages,
    isLoading: sending,
    handoffInProgress: handoffActive,
    activeAgent,
    setActiveAgent,
    pendingAttachments,
    addAttachments,
    removeAttachment,
    handleSubmit: agentHandleSubmit,
    sendMessage,
    clearMessages,
    processHandoff: resetHandoff
  } = useMultiAgentChat({
    initialMessages: [],
    projectId,
    sessionId
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showChatSelector, setShowChatSelector] = useState(false);
  const [toolCallInProgress, setToolCallInProgress] = useState<any>(null);
  const [lastToolCall, setLastToolCall] = useState<any>(null);
  
  const handoffInfo = handoffActive ? { 
    fromAgent: "main", 
    toAgent: activeAgent
  } : null;
  
  const agents = [
    { id: "main", name: "Main Assistant", description: "General purpose AI assistant" },
    { id: "script", name: "Script Writer", description: "Specialized in writing scripts" },
    { id: "image", name: "Image Generator", description: "Specialized in image generation" },
    { id: "scene", name: "Scene Creator", description: "Specialized in creating scenes" }
  ];
  
  const { 
    activeProjectId: projectContextId,
    projectDetails: projectContext,
    isLoading: isContextLoading,
    setActiveProject: setProjectId,
  } = useProjectContext();
  
  const isContextLoaded = !isContextLoading && !!projectContext;
  
  const { 
    chatSessions, 
    activeChatId,
    setActiveChatId,
    getOrCreateChatSession,
    updateChatSession,
    createChatSession
  } = useChatSession();
  
  useEffect(() => {
    if (projectId) {
      getOrCreateChatSession(projectId);
    } else {
      getOrCreateChatSession(null);
    }
  }, [projectId, getOrCreateChatSession]);
  
  useEffect(() => {
    if (activeChatId && Array.isArray(messages) && messages.length > 0) {
      updateChatSession(activeChatId, messages);
    }
  }, [messages, activeChatId, updateChatSession]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await pingServer();
      if (error) {
        setConnectionError("Connection to the server may be unstable. Some features might not work properly.");
      } else {
        setConnectionError(null);
      }
    };
    
    checkConnection();
    
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
  
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (sendMessage) {
      sendMessage(input);
      setInput("");
      
      // Force scroll to bottom after sending a message
      setTimeout(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      agentHandleSubmit(e);
      setInput("");
    }
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
            onSelectSession={(id) => {
              setActiveChatId(id);
              setShowChatSelector(false);
            }}
          />
        )}
        
        <div className="flex flex-col flex-1 overflow-hidden h-full">
          <ConnectionErrorAlert 
            errorMessage={connectionError} 
            onRetry={async () => {
              const { error } = await pingServer();
              if (!error) {
                setConnectionError(null);
              }
            }} 
          />
          
          {/* Increased height for the chat area */}
          <ScrollArea className="flex-1 h-[calc(100vh-250px)] min-h-[500px]">
            <div className="p-4 space-y-4">
              {Array.isArray(messages) && messages.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Start a conversation with the AI assistant.</p>
                </div>
              )}
              
              {Array.isArray(messages) && messages.map((message, index) => (
                <ChatMessage 
                  key={message.id || index} 
                  message={message} 
                  showAgentName={message.role === 'assistant'}
                  onEditContent={(type, content, sceneId) => {
                    console.log("Edit content", type, content, sceneId);
                  }}
                />
              ))}
              
              {handoffActive && handoffInfo && (
                <HandoffIndicator
                  fromAgent={handoffInfo.fromAgent}
                  toAgent={handoffInfo.toAgent}
                  onCancel={() => resetHandoff(handoffInfo.fromAgent, activeAgent, "User canceled")}
                  visible={handoffActive}
                />
              )}
              
              {sending && (
                <ChatMessage
                  message={{
                    id: 'sending',
                    role: 'assistant',
                    content: '',
                    createdAt: new Date().toISOString(),
                    status: "thinking"
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
                    createdAt: new Date().toISOString(),
                    status: "working"
                  }}
                  showAgentName={false}
                />
              )}
              
              <div ref={chatEndRef} />
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
                disabled={sending || handoffActive}
              />
            </div>
            
            <ChatInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleSendMessage}
              disabled={sending || handoffActive}
              isLoading={sending}
              placeholder={
                handoffActive
                  ? "Handoff in progress..."
                  : `Message ${getAgentName(activeAgent)} agent...`
              }
            />
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default MultiAgentChat;
