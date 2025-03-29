
import { useEffect, useState, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAgentName } from "@/lib/agent-icons";
import { Button } from "@/components/ui/button";
import { PlusCircle, History } from "lucide-react";
import { showToast } from "@/utils/toast-utils";
import { ChatSessionSelector } from "./ChatSessionSelector";

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  
  // Initialize chat session
  useEffect(() => {
    if (projectId) {
      getOrCreateChatSession(projectId);
    } else {
      getOrCreateChatSession(null);
    }
  }, [projectId, getOrCreateChatSession]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Improved scrollToBottom function that ensures scrolling works reliably
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  };
  
  // Check connection to server
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
      setTimeout(scrollToBottom, 100);
    } else {
      console.log("Using agent handle submit");
      agentHandleSubmit(e);
      setInput("");
    }
  };
  
  const isContextLoaded = !isContextLoading && !!projectContext;
  
  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-950">
      <ChatHeader 
        projectContext={projectContext} 
        onStartNewChat={startNewChat}
        onShowChatSelector={() => setShowChatSelector(true)}
      />
      
      {showChatSelector && (
        <ChatSessionSelector 
          onClose={() => setShowChatSelector(false)}
          onSelectSession={(id) => {
            setActiveChatId(id);
            setShowChatSelector(false);
          }}
        />
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
        
        {/* Message area */}
        <div className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {Array.isArray(messages) && messages.length === 0 && (
              <div className="text-center py-10 text-slate-500">
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
                  id: 'loading',
                  role: 'assistant',
                  content: '',
                  createdAt: new Date().toISOString(),
                  status: "thinking"
                }}
                showAgentName={true}
              />
            )}
            
            <div ref={messagesEndRef} style={{ height: "1px" }} />
          </div>
        </div>
        
        {/* Attachments preview */}
        {Array.isArray(pendingAttachments) && pendingAttachments.length > 0 && (
          <div className="p-2 border-t">
            <AttachmentPreview
              attachments={pendingAttachments}
              onRemove={removeAttachment}
            />
          </div>
        )}
        
        {/* Input area */}
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
