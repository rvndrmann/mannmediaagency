
import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrowserChatMessage } from "./BrowserChatMessage";
import { ChatMessage, TaskStatus, TaskStep } from "@/hooks/browser-use/types";
import { Card } from "../ui/card";
import { formatRelativeTime } from "@/lib/format-utils";

interface TaskOutputProps {
  messages: ChatMessage[];
  taskStatus: TaskStatus;
  currentTaskId: string | null;
  steps: TaskStep[];
  recordings?: string[];
}

export function TaskOutput({ 
  messages, 
  taskStatus, 
  currentTaskId,
  steps,
  recordings = []
}: TaskOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages, autoScroll]);
  
  // Check if we should show an empty state message
  const showEmptyState = () => {
    // Type safety: ensure we compare with compatible types
    const status = taskStatus as string;
    const emptyConditions = [
      status === "created",
      status === "idle",
      messages.length === 0
    ];
    
    return emptyConditions.some(condition => condition);
  };
  
  // Render empty state message
  const renderEmptyState = () => {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">No Task Output Yet</h3>
          <p className="text-muted-foreground text-sm">
            Start a task to see the output here. The agent will provide updates as it works.
          </p>
        </div>
      </div>
    );
  };
  
  // Group messages by timestamp (day)
  const groupedMessages = messages.reduce((groups: Record<string, ChatMessage[]>, message) => {
    if (!message.timestamp) {
      const key = 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(message);
      return groups;
    }
    
    const date = new Date(message.timestamp);
    const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(message);
    return groups;
  }, {});
  
  // Handle step data conversion to chat messages
  const convertStepsToMessages = (): ChatMessage[] => {
    return steps.map((step) => {
      // Use safe access to properties
      const stepId = typeof step.id === 'string' ? step.id : `step-${step.step}`;
      
      return {
        type: 'step',
        stepNumber: step.step,
        goal: step.description || step.next_goal,
        evaluation: step.evaluation_previous_goal,
        timestamp: new Date().toISOString(),
      };
    });
  };
  
  // Add recordings as messages
  const recordingMessages: ChatMessage[] = recordings.map((url, index) => ({
    type: 'recording',
    text: `Recording ${index + 1}`,
    urls: [url],
    timestamp: new Date().toISOString(),
  }));
  
  // Combine all messages
  const allMessages = [
    ...messages,
    ...convertStepsToMessages(),
    ...recordingMessages
  ];
  
  // We show the empty state if there are no messages or steps
  if (showEmptyState() && steps.length === 0 && recordings.length === 0) {
    return renderEmptyState();
  }
  
  return (
    <ScrollArea className="h-[calc(100vh-250px)]" ref={scrollRef}>
      <div className="p-4 space-y-8">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="space-y-2">
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {date !== 'Unknown' ? formatRelativeTime(new Date(date)) : 'Unknown Date'}
              </h3>
            </div>
            
            <Card className="p-4">
              {dateMessages.map((message, index) => (
                <BrowserChatMessage key={`${date}-${index}`} message={message} />
              ))}
            </Card>
          </div>
        ))}
        
        {/* Show steps as messages */}
        {steps.length > 0 && (
          <div className="space-y-2">
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Steps</h3>
            </div>
            
            <Card className="p-4">
              {steps.map((step) => {
                // Use safe access to properties that might not exist in TaskStep
                const stepId = typeof step.id === 'string' ? step.id : `step-${step.step}`;
                
                return (
                  <div key={stepId} className="py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Step {step.step}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        step.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        step.status === 'failed' ? 'bg-red-100 text-red-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {step.status || 'pending'}
                      </span>
                    </div>
                    <p className="text-sm">{step.description || step.next_goal}</p>
                    {step.details && (
                      <p className="text-xs text-muted-foreground mt-1">{step.details}</p>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        )}
        
        {/* Show recordings if available */}
        {recordings.length > 0 && (
          <div className="space-y-2">
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Recordings</h3>
            </div>
            
            <Card className="p-4">
              {recordings.map((url, index) => (
                <BrowserChatMessage 
                  key={`recording-${index}`} 
                  message={{
                    type: 'recording',
                    text: `Recording ${index + 1}`,
                    urls: [url],
                    timestamp: new Date().toISOString(),
                  }} 
                />
              ))}
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
