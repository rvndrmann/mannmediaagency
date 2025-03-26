
import React from 'react';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TaskStatus, TaskStep, ChatMessage } from '@/hooks/browser-use/types';
import {
  User,
  Bot,
  AlertCircle,
  ListChecks,
  Film,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react';

interface TaskOutputProps {
  messages: ChatMessage[];
  taskStatus: TaskStatus;
}

export function TaskOutput({ messages, taskStatus }: TaskOutputProps) {
  // Helper to get message icon based on type
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-5 w-5 text-blue-500" />;
      case 'system':
        return <Bot className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'step':
        return <ListChecks className="h-5 w-5 text-purple-500" />;
      case 'recording':
        return <Film className="h-5 w-5 text-amber-500" />;
      default:
        return <Bot className="h-5 w-5 text-gray-500" />;
    }
  };

  if (messages.length === 0) {
    if (taskStatus === 'created' || taskStatus === 'idle' || taskStatus === 'pending') {
      return (
        <Card className="p-4 text-center text-muted-foreground">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-lg font-medium mb-2">Waiting to Start</h3>
          <p>Enter a task description and click "Start Task" to begin.</p>
        </Card>
      );
    }
    
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <Play className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-lg font-medium mb-2">Task in Progress</h3>
        <p>The browser automation task is running. Results will appear here.</p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                {getMessageIcon(message.type)}
              </div>
              
              <div className="flex-1">
                {message.type === 'step' && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium">Step {message.stepNumber || 'N/A'}</span>
                    {message.goal && (
                      <Badge variant="outline">{message.goal}</Badge>
                    )}
                  </div>
                )}
                
                {message.type === 'recording' && message.urls && message.urls.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {message.urls.map((url, urlIndex) => (
                      <div key={urlIndex} className="flex flex-col">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <Film className="h-4 w-4" />
                          View Recording {urlIndex + 1}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                
                {message.text && (
                  <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : ''}`}>
                    {message.text}
                  </p>
                )}
                
                {message.evaluation && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-xs font-medium">Evaluation</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{message.evaluation}</p>
                  </div>
                )}
                
                {message.timestamp && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
