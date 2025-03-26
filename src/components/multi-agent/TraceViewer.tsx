
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { formatTraceTimestamp, formatDuration } from '@/lib/trace-utils';
import { AgentBadge } from './AgentBadge';

export interface TraceEvent {
  eventType: string;
  timestamp: string;
  agentType?: string;
  data: any;
}

export interface TraceSummary {
  agentTypes: string[];
  handoffs: number;
  toolCalls: number;
  success: boolean;
  duration: number;
  messageCount?: number;
}

export interface Trace {
  id: string;
  runId: string;
  userId: string;
  sessionId: string;
  messages: any[];
  events: TraceEvent[];
  startTime: string;
  endTime?: string;
  summary?: TraceSummary;
}

interface TraceProps {
  trace: Trace;
}

export const TraceViewer: React.FC<TraceProps> = ({ trace }) => {
  const [activeTab, setActiveTab] = useState('summary');
  
  // Safe access to trace properties with fallbacks
  const events = trace?.events || [];
  const summary = trace?.summary || { agentTypes: [], handoffs: 0, toolCalls: 0, success: false, duration: 0 };
  const startTime = trace?.startTime || '';
  const endTime = trace?.endTime || '';
  
  const handoffEvents = events.filter(e => e.eventType === 'handoff');
  const toolCallEvents = events.filter(e => e.eventType === 'tool_call');
  const errorEvents = events.filter(e => e.eventType === 'error');
  
  // Helper function to safely render event data
  const renderEventData = (data: any) => {
    if (data === null || data === undefined) {
      return null;
    }
    
    try {
      // Convert to string if it's an object
      if (typeof data === 'object') {
        return JSON.stringify(data, (key, value) => {
          // Handle circular references and React internal props
          if (key && typeof value === 'object' && value !== null) {
            if (key.startsWith('__react') || key.startsWith('_reactFiber') ||
                key.includes('Fiber') || key.includes('fiber')) {
              return '[React Internal]';
            }
            // Skip DOM nodes and elements that might contain circular refs
            if (value instanceof Node || value instanceof Element) {
              return '[DOM Element]';
            }
            // Skip functions
            if (typeof value === 'function') {
              return '[Function]';
            }
          }
          return value;
        }, 2);
      }
      // Convert to string for all other types
      return String(data);
    } catch (e) {
      console.error("Error rendering event data:", e);
      return "Error rendering data";
    }
  };
  
  const renderAgentFlow = () => (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-2">Agent Flow</h3>
      <div className="space-y-2">
        {events.map((event, index) => (
          <div key={index} className="flex items-center gap-2">
            <AgentBadge agentType={event.agentType || 'Unknown'} />
            <span>{event.eventType}</span>
            <span className="text-xs text-muted-foreground">{formatTraceTimestamp(event.timestamp)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
  
  const renderTimeline = () => (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-2">Timeline</h3>
      <div className="space-y-2">
        {events.map((event, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="w-24 shrink-0 text-right text-xs text-muted-foreground">
              {formatTraceTimestamp(event.timestamp)}
            </div>
            <div>
              <p className="font-medium">{event.eventType}</p>
              {event.data && (
                <pre className="text-xs bg-gray-100 p-2 rounded-md overflow-auto max-h-40">
                  {renderEventData(event.data)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
  
  // Safely access summary properties with fallbacks from the properly typed summary object
  const agentTypes = summary.agentTypes || [];
  const success = summary.success || false;
  const handoffs = summary.handoffs || 0;
  const toolCalls = summary.toolCalls || 0;
  const duration = summary.duration || 0;
  
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Trace Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p>
              <span className="font-medium">Status:</span>{" "}
              {success ? (
                <Badge variant="success">Success</Badge>
              ) : (
                <Badge variant="destructive">Failed</Badge>
              )}
            </p>
            <p>
              <span className="font-medium">Duration:</span> {formatDuration(duration)}
            </p>
            <p>
              <span className="font-medium">Start Time:</span> {formatTraceTimestamp(startTime)}
            </p>
            {endTime && (
              <p>
                <span className="font-medium">End Time:</span> {formatTraceTimestamp(endTime)}
              </p>
            )}
          </div>
          <div>
            <p>
              <span className="font-medium">Agents:</span>{" "}
              {agentTypes.map((agentType, index) => (
                <AgentBadge key={index} agentType={agentType} />
              ))}
            </p>
            <p>
              <span className="font-medium">Handoffs:</span> {handoffs}
            </p>
            <p>
              <span className="font-medium">Tool Calls:</span> {toolCalls}
            </p>
          </div>
        </div>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="flow">Agent Flow</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Summary Details</h3>
            <p>This tab provides a high-level overview of the trace.</p>
          </Card>
        </TabsContent>
        <TabsContent value="flow">
          {renderAgentFlow()}
        </TabsContent>
        <TabsContent value="timeline">
          {renderTimeline()}
        </TabsContent>
      </Tabs>
    </div>
  );
};
