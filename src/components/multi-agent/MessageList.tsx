
import React, { useRef, useEffect } from 'react';
import { Message, Attachment } from '@/types/message';
import { AgentType } from '@/hooks/use-multi-agent-chat';
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import ReactMarkdown from 'react-markdown';
import { Paperclip } from 'lucide-react';

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFileUpload(files);
    }
  };

  return (
    <div 
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <span className="text-xl">🤖</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Start a conversation</h3>
          <p className="text-slate-400 max-w-md">
            Send a message to start chatting with the {activeAgent} agent.
            You can switch between different specialized agents using the selector above.
          </p>
        </div>
      ) : (
        messages.map((message, index) => (
          <Card 
            key={index} 
            className={`p-4 ${message.role === 'user' ? 'bg-slate-800' : 'bg-slate-700'}`}
          >
            <div className="flex gap-3">
              <Avatar>
                <div className={`${message.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'} w-10 h-10 rounded-full flex items-center justify-center`}>
                  <span className="text-white font-medium">
                    {message.role === 'user' ? 'U' : message.agentType?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-white">
                    {message.role === 'user' ? 'You' : message.agentType || 'Assistant'}
                  </span>
                  {message.status === 'thinking' && (
                    <span className="text-slate-400 text-sm">Thinking...</span>
                  )}
                </div>
                
                <div className="text-slate-200 prose prose-invert max-w-none">
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                </div>
                
                {/* Display attachments if any */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.attachments.map((attachment) => 
                      attachment.type === 'image' ? (
                        <div key={attachment.id} className="relative group">
                          <img 
                            src={attachment.url} 
                            alt={attachment.name}
                            className="max-w-[200px] max-h-[150px] rounded-md border border-slate-600"
                          />
                        </div>
                      ) : (
                        <div key={attachment.id} className="flex items-center p-2 bg-slate-800 rounded gap-2">
                          <Paperclip size={16} />
                          <span className="text-sm text-slate-300">{attachment.name}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
