
import React, { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Send, Loader2, Play, Pause, StopCircle, RefreshCw } from "lucide-react";
import { TaskStatus } from "@/hooks/browser-use/types";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { AvatarImage } from "@radix-ui/react-avatar";
import { AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

interface BrowserChatInterfaceProps {
  taskInput: string;
  setTaskInput: (value: string) => void;
  onSubmit: () => Promise<void>;
  isProcessing: boolean;
  taskStatus: TaskStatus;
  userCredits: number | null;
  taskOutput: string | null;
  error: string | null;
  onStop: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onRestart: () => Promise<void>;
  currentTaskId: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'processing' | 'complete' | 'error';
}

export const BrowserChatInterface: React.FC<BrowserChatInterfaceProps> = ({
  taskInput,
  setTaskInput,
  onSubmit,
  isProcessing,
  taskStatus,
  userCredits,
  taskOutput,
  error,
  onStop,
  onPause,
  onResume,
  onRestart,
  currentTaskId
}) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('workerAI_chatHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (e) {
        console.error("Error parsing saved chat history:", e);
      }
    }
  }, []);
  
  // Save chat history to localStorage when it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('workerAI_chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Add taskOutput to chat history when it changes
  useEffect(() => {
    if (taskOutput && (!isProcessing || taskStatus === 'completed')) {
      // Check if we already have this output in chat history
      const lastAssistantMessage = [...chatHistory].reverse().find(msg => msg.role === 'assistant');
      if (!lastAssistantMessage || lastAssistantMessage.content !== taskOutput) {
        setChatHistory(prev => [
          ...prev.filter(msg => msg.role !== 'assistant' || msg.status !== 'processing'),
          { 
            role: 'assistant', 
            content: taskOutput, 
            timestamp: new Date(),
            status: 'complete'
          }
        ]);
      }
    }
  }, [taskOutput, isProcessing, taskStatus]);
  
  // Add error to chat history when it occurs
  useEffect(() => {
    if (error) {
      setChatHistory(prev => [
        ...prev.filter(msg => msg.role !== 'assistant' || msg.status !== 'processing'),
        { 
          role: 'assistant', 
          content: `Error: ${error}`, 
          timestamp: new Date(),
          status: 'error'
        }
      ]);
    }
  }, [error]);

  // Add "processing" message when task starts
  useEffect(() => {
    if (isProcessing && taskStatus === 'running') {
      // Only add if we don't already have a processing message
      if (!chatHistory.some(msg => msg.role === 'assistant' && msg.status === 'processing')) {
        setChatHistory(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: 'Working on your task...', 
            timestamp: new Date(),
            status: 'processing'
          }
        ]);
      }
    }
  }, [isProcessing, taskStatus, chatHistory]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    // Add user message to chat
    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: taskInput, timestamp: new Date() }
    ]);
    
    try {
      await onSubmit();
    } catch (err) {
      console.error("Error submitting task:", err);
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    localStorage.removeItem('workerAI_chatHistory');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <Card className="flex flex-col h-[600px] p-0 overflow-hidden">
      <div className="bg-primary/10 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Worker AI Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat}>Clear Chat</Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
            <Bot className="h-12 w-12 text-primary/30 mb-4" />
            <h3 className="font-medium text-lg mb-2">Welcome to Worker AI</h3>
            <p>Describe what you want the AI to do in your web browser and it will execute tasks for you.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.status === 'error'
                      ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-sm break-words whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 flex items-center gap-2">
                      {formatTime(message.timestamp)}
                      {message.status === 'processing' && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>{user?.email?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      <div className="p-3 border-t">
        {isProcessing && taskStatus !== 'completed' && taskStatus !== 'failed' && taskStatus !== 'stopped' && (
          <div className="flex gap-2 mb-3 justify-end">
            {taskStatus === 'running' ? (
              <>
                <Button variant="outline" size="sm" onClick={onPause} className="gap-1">
                  <Pause className="h-4 w-4" /> Pause
                </Button>
                <Button variant="outline" size="sm" onClick={onStop} className="gap-1">
                  <StopCircle className="h-4 w-4" /> Stop
                </Button>
              </>
            ) : taskStatus === 'paused' ? (
              <>
                <Button variant="outline" size="sm" onClick={onResume} className="gap-1">
                  <Play className="h-4 w-4" /> Resume
                </Button>
                <Button variant="outline" size="sm" onClick={onStop} className="gap-1">
                  <StopCircle className="h-4 w-4" /> Stop
                </Button>
              </>
            ) : null}
          </div>
        )}
      
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            className="flex-1 min-h-[60px] p-2 border rounded-md resize-none"
            placeholder="Describe what you want the AI to do in your web browser..."
            disabled={isProcessing && taskStatus !== 'completed' && taskStatus !== 'failed' && taskStatus !== 'stopped' && taskStatus !== 'expired'}
            ref={inputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <Button 
              type="submit"
              disabled={isProcessing && taskStatus !== 'completed' && taskStatus !== 'failed' && taskStatus !== 'stopped' && taskStatus !== 'expired' || !userCredits || userCredits < 1}
              className="h-full"
            >
              {isProcessing && taskStatus !== 'completed' && taskStatus !== 'failed' && taskStatus !== 'stopped' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            
            {currentTaskId && (taskStatus === 'completed' || taskStatus === 'failed' || taskStatus === 'stopped' || taskStatus === 'expired') && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onRestart}
                className="h-10"
                title="Run this task again"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
};
