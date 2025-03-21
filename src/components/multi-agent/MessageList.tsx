
import React, { useRef, useEffect, useState } from 'react';
import { Message, Attachment } from '@/types/message';
import { Bot, User, AlertCircle, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { AgentType } from '@/hooks/use-multi-agent-chat';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  activeAgent: AgentType;
  onFileUpload: (files: File[]) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages,
  activeAgent,
  onFileUpload 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Configure dropzone for file uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileUpload,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    }
  });

  // Update drag active state based on dropzone state
  useEffect(() => {
    setDragActive(isDragActive);
  }, [isDragActive]);

  // Get agent color based on type
  const getAgentColor = (agentType?: string): string => {
    if (!agentType) return 'text-blue-500';
    
    switch (agentType) {
      case 'main': return 'text-blue-500';
      case 'script': return 'text-amber-500';
      case 'image': return 'text-purple-500';
      case 'tool': return 'text-green-500';
      case 'scene': return 'text-pink-500';
      default: return 'text-slate-500';
    }
  };

  // Get agent icon based on type
  const renderAgentIcon = (agentType?: string) => {
    const color = getAgentColor(agentType);
    return <Bot className={`h-6 w-6 ${color}`} />;
  };

  // Render message attachments
  const renderAttachments = (attachments?: Attachment[]) => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map(attachment => (
          <div key={attachment.id} className="relative">
            {attachment.type === 'image' && (
              <img 
                src={attachment.url} 
                alt={attachment.name}
                className="max-h-64 rounded-md border border-slate-700"
              />
            )}
            {attachment.type === 'file' && (
              <div className="flex items-center p-2 bg-slate-800 rounded-md">
                <ImageIcon className="h-4 w-4 mr-2" />
                <span className="text-xs truncate max-w-[150px]">{attachment.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render handoff indicator
  const renderHandoff = (message: Message) => {
    if (!message.handoffRequest) return null;
    
    return (
      <div className="mt-2 flex items-center text-sm text-slate-400 rounded bg-slate-800/50 p-2">
        <span>Handed off to </span>
        <span className={`font-medium ml-1 ${getAgentColor(message.handoffRequest.targetAgent)}`}>
          {message.handoffRequest.targetAgent}
        </span>
        <ArrowRight className="mx-1 h-3 w-3" />
        <span className="text-slate-500 italic">{message.handoffRequest.reason}</span>
      </div>
    );
  };

  return (
    <div 
      {...getRootProps()} 
      className={cn(
        "flex-1 overflow-y-auto py-4 px-2 sm:px-4",
        dragActive && "bg-slate-800/50 border-2 border-dashed border-slate-700"
      )}
    >
      <input {...getInputProps()} />
      
      {dragActive && (
        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center z-10">
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-medium text-white">Drop images here</h3>
            <p className="text-slate-400 mt-2">Upload images to share with the AI</p>
          </div>
        </div>
      )}
      
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <Bot className="h-16 w-16 text-slate-700 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Start a conversation</h3>
          <p className="text-slate-400 max-w-md">
            Chat with our multi-agent system to get help with various tasks. Each agent specializes in different areas.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-slate-800 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                  {message.role === 'user' 
                    ? <User className="h-5 w-5 text-slate-300" /> 
                    : renderAgentIcon(message.agentType)
                  }
                </div>
                
                <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={cn(
                    "p-3 rounded-lg",
                    message.role === 'user' 
                      ? "bg-blue-600 text-white" 
                      : "bg-slate-800 text-slate-100"
                  )}>
                    {message.status === 'thinking' ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse">Thinking</div>
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    ) : message.status === 'error' ? (
                      <div className="flex items-center text-red-500">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Error: {message.content}
                      </div>
                    ) : (
                      <div className="whitespace-pre-line">{message.content}</div>
                    )}
                  </div>
                  
                  {renderAttachments(message.attachments)}
                  {renderHandoff(message)}
                  
                  {message.modelUsed && (
                    <div className="text-xs text-slate-500 mt-1">
                      Model: {message.modelUsed}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};
