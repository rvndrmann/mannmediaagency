import { useState, useRef, useEffect } from "react";
import { Message } from "@/types/message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { XCircle, MessageSquare, Bot, Paperclip } from "lucide-react";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { AgentSelector } from "@/components/multi-agent/AgentSelector";
import { AttachmentPreview } from "@/components/multi-agent/AttachmentPreview";
import { FileAttachmentButton } from "@/components/multi-agent/FileAttachmentButton";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { useCanvas } from "@/hooks/use-canvas";
import { toast } from "sonner";

interface CanvasChatProps {
  onClose: () => void;
  projectId?: string;
}

export function CanvasChat({ onClose, projectId }: CanvasChatProps) {
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAgent, setActiveAgent] = useState<string>("script");
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  
  const { project, selectedScene, updateScene, saveFullScript, divideScriptToScenes } = useCanvas(projectId);
  
  const { 
    isProcessing,
    agentMessages,
    processAgentRequest
  } = useCanvasAgent({
    projectId: project?.id || "",
    sceneId: selectedScene?.id,
    updateScene,
    saveFullScript,
    divideScriptToScenes
  });
  
  // Keep local messages in sync with agent messages
  useEffect(() => {
    setMessages(agentMessages);
  }, [agentMessages]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (lastMessageRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() && !pendingAttachments.length) return;
    if (!project) {
      toast.error("No project selected");
      return;
    }
    
    const userMessage = input;
    setInput("");
    
    // Add context about the current project and scene
    let contextInfo = `This is for project "${project.title}".`;
    if (selectedScene) {
      contextInfo += ` I'm currently working on scene "${selectedScene.title}".`;
      
      if (selectedScene.script) {
        contextInfo += ` The scene script is: "${selectedScene.script.substring(0, 200)}${selectedScene.script.length > 200 ? '...' : ''}"`;
      }
    }
    
    try {
      await processAgentRequest(`${userMessage}\n\nContext: ${contextInfo}`, {
        projectTitle: project.title,
        sceneTitle: selectedScene?.title,
        sceneId: selectedScene?.id,
      }, activeAgent as any);
    } catch (error) {
      console.error("Error processing chat request:", error);
      toast.error("Failed to process request");
    }
  };
  
  const switchAgent = (agentId: string) => {
    setActiveAgent(agentId);
  };
  
  const addAttachments = (files: File[]) => {
    // Implement attachment handling if needed
    toast.info("Attachments are not yet supported in Canvas Chat");
  };
  
  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1F29] border-r border-gray-700/50">
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-medium text-white">Canvas Assistant</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <XCircle className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="border-b border-gray-700/50">
        <AgentSelector selectedAgentId={activeAgent} onSelect={switchAgent} />
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length > 0 ? (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <ChatMessage 
                key={index} 
                message={message} 
                showAgentName={message.role === "assistant" && message.agentType !== undefined}
              />
            ))}
            <div ref={lastMessageRef} className="h-px" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="bg-primary/10 p-3 rounded-full mb-3">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white">Canvas Assistant</h3>
            <p className="text-sm text-gray-400 max-w-[250px] mt-2">
              Ask me about your video project or for help with specific scenes.
            </p>
          </div>
        )}
      </ScrollArea>
      
      <div className="p-3 border-t border-gray-700/50">
        {pendingAttachments && pendingAttachments.length > 0 && (
          <div className="mb-2">
            <AttachmentPreview
              attachments={pendingAttachments}
              onRemove={removeAttachment}
              isRemovable={true}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <ChatInput
              input={input}
              isLoading={isProcessing}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              showAttachmentButton={false}
            />
          </div>
          
          <FileAttachmentButton onAttach={addAttachments} />
        </div>
      </div>
    </div>
  );
}
