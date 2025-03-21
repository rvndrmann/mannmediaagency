
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TraceData, TraceEvent } from "@/hooks/multi-agent/types";
import { Check, X, MessageSquare, Wrench, GitBranch, AlertCircle } from 'lucide-react';

interface TraceViewerProps {
  trace: TraceData;
}

export const TraceViewer: React.FC<TraceViewerProps> = ({ trace }) => {
  // Format timestamp
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get event icon
  const getEventIcon = (event: TraceEvent) => {
    switch (event.eventType) {
      case 'user_message':
        return <MessageSquare className="text-blue-500" size={18} />;
      case 'assistant_response':
        return <MessageSquare className="text-green-500" size={18} />;
      case 'tool_call':
        return <Wrench className="text-amber-500" size={18} />;
      case 'handoff':
        return <GitBranch className="text-purple-500" size={18} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={18} />;
      default:
        return <div className="w-[18px] h-[18px] rounded-full bg-gray-300" />;
    }
  };

  // Get event description
  const getEventDescription = (event: TraceEvent): string => {
    switch (event.eventType) {
      case 'user_message':
        return `User sent a message`;
      case 'assistant_response':
        return `${event.agentType} agent responded`;
      case 'tool_call':
        return `${event.agentType} agent called tool: ${event.data.tool}`;
      case 'handoff':
        return `Handoff from ${event.data.from} to ${event.data.to} agent`;
      case 'error':
        return `Error occurred: ${event.data.message}`;
      default:
        return `Unknown event: ${event.eventType}`;
    }
  };

  // Get event details
  const getEventDetails = (event: TraceEvent) => {
    switch (event.eventType) {
      case 'user_message':
      case 'assistant_response':
        return event.data.content ? (
          <div className="mt-2 bg-gray-50 p-2 rounded text-sm">
            {event.data.content}
          </div>
        ) : null;
      case 'tool_call':
        return (
          <div className="mt-2 flex items-center">
            <span className="text-sm mr-2">Result:</span>
            {event.data.success ? (
              <Check className="text-green-500" size={16} />
            ) : (
              <X className="text-red-500" size={16} />
            )}
          </div>
        );
      case 'handoff':
        return (
          <div className="text-sm mt-2">
            Reason: {event.data.reason || "Not specified"}
          </div>
        );
      case 'error':
        return (
          <div className="mt-2 bg-red-50 p-2 rounded text-sm text-red-700">
            {event.data.message}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trace Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
              <p>{new Date(trace.summary.startTime).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Duration</h3>
              <p>{Math.round(trace.summary.duration / 1000)} seconds</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className={trace.summary.success ? "text-green-600" : "text-red-600"}>
                {trace.summary.success ? "Successful" : "Failed"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Messages</h3>
              <p>{trace.summary.messageCount}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Tool Calls</h3>
              <p>{trace.summary.toolCalls}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Handoffs</h3>
              <p>{trace.summary.handoffs}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Agents Used</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {trace.summary.agentTypes.map((agent) => (
                  <span 
                    key={agent}
                    className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>
            <div>
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
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gray-200" />
            
            {/* Timeline events */}
            <ul className="space-y-4 relative">
              {trace.events.map((event) => (
                <li key={event.id} className="ml-10 relative">
                  {/* Event indicator */}
                  <div className="absolute -left-10 mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-white z-10">
                    {getEventIcon(event)}
                  </div>
                  
                  {/* Event content */}
                  <div className="pb-4">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-2">
                        {formatTime(event.timestamp)}
                      </span>
                      <span className="font-medium text-sm">
                        {getEventDescription(event)}
                      </span>
                    </div>
                    
                    {/* Event details */}
                    {getEventDetails(event)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
