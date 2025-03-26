
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Bot, Send, StopCircle, Pause, Play, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TaskStatus, ChatMessage, ConnectionStatus } from '@/hooks/browser-use/types';
import { BrowserChatMessage } from './BrowserChatMessage';
import { safeParse } from '@/lib/safe-stringify';

interface BrowserChatInterfaceProps {
  taskInput: string;
  setTaskInput: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  taskStatus: TaskStatus;
  userCredits: number | null;
  taskOutput: ChatMessage[] | string | any | null; // Handle various output types
  error: string | null;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  currentTaskId: string | null;
  connectionStatus?: ConnectionStatus;
}

export function BrowserChatInterface({
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
  currentTaskId,
  connectionStatus = 'disconnected'
}: BrowserChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Process task output into chat messages
  useEffect(() => {
    if (!taskOutput) return;
    
    try {
      let newMessages: ChatMessage[] = [];
      
      // Handle string output
      if (typeof taskOutput === 'string') {
        newMessages = [{
          type: 'system',
          text: taskOutput,
          timestamp: new Date().toISOString()
        }];
      }
      // Handle array of ChatMessage objects
      else if (Array.isArray(taskOutput)) {
        if (taskOutput.length > 0 && typeof taskOutput[0] === 'object') {
          // If it's already in the expected format
          if ('type' in taskOutput[0]) {
            newMessages = taskOutput.map(msg => {
              // Ensure the timestamp is set
              if (!msg.timestamp) {
                return { ...msg, timestamp: new Date().toISOString() };
              }
              return msg;
            });
          } 
          // Try to parse as text messages from array items
          else {
            newMessages = taskOutput.map(item => {
              if (typeof item === 'string') {
                return {
                  type: 'system',
                  text: item,
                  timestamp: new Date().toISOString()
                };
              }
              // Convert object to string representation
              return {
                type: 'system',
                text: String(item?.text || JSON.stringify(item)),
                timestamp: new Date().toISOString()
              };
            });
          }
        }
      }
      // Handle object output (trying to extract properties)
      else if (typeof taskOutput === 'object' && taskOutput !== null) {
        if ('type' in taskOutput && 'text' in taskOutput) {
          newMessages = [{ 
            ...taskOutput,
            timestamp: taskOutput.timestamp || new Date().toISOString()
          }];
        } else {
          // Convert arbitrary object to a string message
          newMessages = [{
            type: 'system',
            text: JSON.stringify(taskOutput),
            timestamp: new Date().toISOString()
          }];
        }
      }
      
      setMessages(newMessages);
      
      // Store messages in localStorage for persistence
      try {
        localStorage.setItem('workerAI_lastChatMessages', JSON.stringify(newMessages));
      } catch (storageError) {
        console.error('Failed to save chat messages to localStorage:', storageError);
      }
    } catch (error) {
      console.error('Error processing task output:', error);
      setMessages([{
        type: 'error',
        text: 'Error processing task output. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [taskOutput]);
  
  // Load saved messages on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('workerAI_lastChatMessages');
    if (savedMessages) {
      const parsedMessages = safeParse<ChatMessage[]>(savedMessages, []);
      if (parsedMessages.length > 0) {
        setMessages(parsedMessages);
      }
    }
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskInput.trim() || isProcessing) return;
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        type: 'user',
        text: taskInput,
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Call the submit function
    onSubmit();
  };
  
  // Determine if task controls should be shown
  const showTaskControls = taskStatus !== 'pending' && taskStatus !== 'completed' && 
                         taskStatus !== 'failed' && taskStatus !== 'stopped' && 
                         taskStatus !== 'expired';
  
  // Display a welcome message if no messages exist
  const showWelcomeMessage = messages.length === 0 && !isProcessing;
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle>Worker AI Assistant</CardTitle>
            {connectionStatus === 'connected' && (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                Live
              </Badge>
            )}
          </div>
          {userCredits !== null && (
            <Badge variant="outline">
              Credits: {userCredits}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-370px)] md:h-[450px]" ref={scrollAreaRef}>
          <div className="p-4 space-y-1">
            {/* Display error message if present */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Welcome message */}
            {showWelcomeMessage && (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-primary mx-auto mb-2 opacity-70" />
                <h3 className="text-lg font-medium mb-1">Worker AI</h3>
                <p className="text-sm text-muted-foreground">
                  Describe what you want the AI to do in your web browser.
                </p>
              </div>
            )}
            
            {/* Chat messages */}
            {messages.map((message, index) => (
              <BrowserChatMessage 
                key={index} 
                message={message}
                showTimestamp={true}
              />
            ))}
            
            {/* Loading indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">
                  {connectionStatus === 'connected' 
                    ? 'Processing your request...' 
                    : 'Connecting to browser...'}
                </span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="flex-none pt-0">
        {/* Show task controls when appropriate */}
        {showTaskControls && (
          <div className="w-full mb-3 flex justify-center gap-2">
            {taskStatus === 'running' ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onPause}
                className="flex items-center gap-1"
              >
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </Button>
            ) : (
              taskStatus === 'paused' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onResume}
                  className="flex items-center gap-1"
                >
                  <Play className="h-4 w-4" />
                  <span>Resume</span>
                </Button>
              )
            )}
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onStop}
              className="flex items-center gap-1"
            >
              <StopCircle className="h-4 w-4" />
              <span>Stop</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRestart}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Restart</span>
            </Button>
          </div>
        )}
        
        {/* Completed task controls */}
        {(taskStatus === 'completed' || taskStatus === 'failed' || taskStatus === 'stopped' || taskStatus === 'expired') && (
          <div className="w-full mb-3 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRestart}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try another task</span>
            </Button>
          </div>
        )}
        
        {/* Input form */}
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Describe what you want the AI to do in your web browser"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            disabled={isProcessing || 
                    taskStatus === 'running' || 
                    taskStatus === 'paused'}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!taskInput.trim() || 
                     isProcessing || 
                     taskStatus === 'running' || 
                     taskStatus === 'paused'}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
