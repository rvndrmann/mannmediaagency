
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TraceData, TraceEvent } from '@/hooks/multi-agent/types';

interface TraceViewerProps {
  trace: TraceData;
}

export function TraceViewer({ trace }: TraceViewerProps) {
  // Format time as HH:MM:SS
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Format duration in milliseconds to seconds
  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Get appropriate styling for each event type
  const getEventStyle = (event: TraceEvent) => {
    switch(event.eventType) {
      case 'user_message':
        return 'border-blue-500 bg-blue-500/10';
      case 'assistant_response':
        return 'border-green-500 bg-green-500/10';
      case 'tool_call':
        return event.data.success 
          ? 'border-purple-500 bg-purple-500/10' 
          : 'border-red-500 bg-red-500/10';
      case 'handoff':
        return 'border-amber-500 bg-amber-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  // Get a human-readable label for the event
  const getEventLabel = (event: TraceEvent) => {
    switch(event.eventType) {
      case 'user_message':
        return 'User Message';
      case 'assistant_response':
        return `${event.agentType} Response`;
      case 'tool_call':
        return event.data.success
          ? `Tool Call: ${event.data.tool}`
          : `Failed Tool Call: ${event.data.tool}`;
      case 'handoff':
        return `Handoff: ${event.data.from} → ${event.data.to}`;
      default:
        return 'Event';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trace Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
              <p>{new Date(trace.summary.startTime).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Duration</h3>
              <p>{formatDuration(trace.summary.duration)}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Messages</h3>
              <p>{trace.summary.messageCount}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Agents</h3>
              <div className="flex flex-wrap gap-1">
                {trace.summary.agentTypes.map(agent => (
                  <span 
                    key={agent}
                    className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Tool Calls</h3>
              <p>{trace.summary.toolCalls}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Model</h3>
              <p>{trace.summary.modelUsed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trace Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trace.events.map((event, index) => (
              <div 
                key={`${event.id}-${index}`}
                className={`p-3 border-l-4 rounded-md ${getEventStyle(event)}`}
              >
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{getEventLabel(event)}</span>
                  <span className="text-sm text-gray-500">{formatTime(event.timestamp)}</span>
                </div>
                {event.eventType === 'user_message' && (
                  <div className="text-sm">{event.data.content}</div>
                )}
                {event.eventType === 'assistant_response' && (
                  <div className="text-sm">{event.data.content}</div>
                )}
                {event.eventType === 'tool_call' && (
                  <div className="text-sm">
                    {event.data.success 
                      ? `Successfully called the ${event.data.tool} tool`
                      : `Failed to execute the ${event.data.tool} tool`
                    }
                  </div>
                )}
                {event.eventType === 'handoff' && (
                  <div className="text-sm">
                    Request was handed off from <span className="font-medium">{event.data.from}</span> to <span className="font-medium">{event.data.to}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
