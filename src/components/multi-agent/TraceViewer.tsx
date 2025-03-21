
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, Bot, Tool } from 'lucide-react';

interface TraceProps {
  traceData: any;
  conversationId: string;
}

export const TraceViewer = ({ traceData, conversationId }: TraceProps) => {
  // Format the trace data for display
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'executing':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Check if the trace data is available
  if (!traceData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No trace data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Trace: {traceData.trace_id?.substring(0, 8) || '(Unknown)'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Conversation: {conversationId.substring(0, 8)}
            </Badge>
            <Badge variant="outline" className="text-xs bg-gray-100">
              <Clock className="h-3 w-3 mr-1" />
              {formatDate(traceData.timestamp || new Date().toISOString())}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {traceData.events?.map((event: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {event.type === 'message' ? (
                      <MessageSquare className="h-3.5 w-3.5" />
                    ) : (
                      <Tool className="h-3.5 w-3.5" />
                    )}
                    <span className="font-medium text-sm">{event.type}</span>
                  </div>
                  {event.status && (
                    <Badge className={`${getStatusColor(event.status)} text-white text-xs`}>
                      {event.status}
                    </Badge>
                  )}
                </div>
                
                {event.content && (
                  <div className="bg-gray-50 p-2 rounded-md text-xs mt-2 whitespace-pre-wrap break-words">
                    {typeof event.content === 'object'
                      ? JSON.stringify(event.content, null, 2)
                      : event.content}
                  </div>
                )}
                
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Metadata:</div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(event.metadata).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{key}:</span>{' '}
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {(!traceData.events || traceData.events.length === 0) && (
              <p className="text-center text-gray-500 py-4">
                No events found in this trace
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
