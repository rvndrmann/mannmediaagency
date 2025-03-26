
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';
import { TraceViewer, Trace as ViewerTrace } from './TraceViewer';
import { extractTraceData, getSafeTraceSummary, safeTraceEvents } from '@/lib/trace-utils';
import { safeStringify } from '@/lib/safe-stringify';

interface AgentInteraction {
  id: string;
  timestamp: string;
  metadata: any;
  user_id: string;
  agent_type: string;
  user_message: string;
  assistant_response: string;
  has_attachments: boolean;
}

export const TraceDashboard: React.FC = () => {
  const [traces, setTraces] = useState<AgentInteraction[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<ViewerTrace | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTraces();
  }, []);
  
  const fetchTraces = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('agent_type', 'trace_summary')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      // Process the data to extract trace information and handle undefined fields
      const processedTraces = (data || []).map((item: AgentInteraction) => {
        return {
          id: item.id,
          timestamp: item.timestamp,
          agent_type: item.agent_type,
          user_message: item.user_message,
          assistant_response: item.assistant_response,
          has_attachments: item.has_attachments,
          user_id: item.user_id || '',
          metadata: item.metadata || {}
        };
      });
      
      setTraces(processedTraces);
    } catch (error) {
      console.error('Error fetching traces:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const viewTraceDetails = async (traceId: string) => {
    try {
      // Get the full trace data
      const { data, error } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('id', traceId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('No trace data found');
      }
      
      // Safely extract the trace data
      const traceData = extractTraceData(data.metadata);
      
      if (!traceData) {
        throw new Error('Invalid trace data format');
      }
      
      // Convert the trace events to the format expected by TraceViewer
      const convertedEvents = traceData.events.map(event => ({
        eventType: event.type || "unknown",
        timestamp: event.timestamp,
        agentType: event.data?.agentType || "unknown",
        data: event.data
      }));
      
      // Get the summary safely
      const summary = getSafeTraceSummary(traceData);
      
      // Construct a complete Trace object compatible with TraceViewer
      const trace: ViewerTrace = {
        id: traceData.id || data.id,
        runId: traceData.id || data.id,
        userId: data.user_id || '',
        sessionId: traceData.metadata?.sessionId || '',
        messages: [],
        events: convertedEvents,
        startTime: traceData.start_time,
        endTime: traceData.end_time,
        summary: summary
      };
      
      setSelectedTrace(trace);
    } catch (error) {
      console.error('Error fetching trace details:', error);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Trace Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Traces</h2>
            <Button variant="outline" onClick={fetchTraces} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : traces.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No traces found.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full">
              <div className="divide-y divide-gray-200">
                {traces.map((trace) => (
                  <div key={trace.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">Trace ID: {trace.id.substring(0, 8)}...</h3>
                        <p className="text-sm text-gray-500">
                          Created {formatDistanceToNow(new Date(trace.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <Badge variant="secondary">{trace.agent_type}</Badge>
                      </div>
                      <div>
                        <Button variant="outline" size="sm" onClick={() => viewTraceDetails(trace.id)}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {selectedTrace && (
        <Card className="mt-4">
          <TraceViewer trace={selectedTrace} />
        </Card>
      )}
    </div>
  );
}
