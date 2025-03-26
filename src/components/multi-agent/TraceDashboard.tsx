
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';
import { TraceViewer, Trace } from './TraceViewer';

interface TraceItem {
  id: string;
  timestamp: string;
  metadata: any;
  user_id: string;
  group_id?: string; // Make this optional
}

export const TraceDashboard: React.FC = () => {
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
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
      const processedTraces = (data || []).map(item => {
        return {
          id: item.id,
          timestamp: item.timestamp,
          group_id: item.group_id || '', // Use empty string as fallback
          metadata: item.metadata,
          user_id: item.user_id || ''
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
      
      // Safely extract the trace data
      const metadata = data?.metadata || {};
      let traceData: any = {};
      
      // Check if metadata is an object and has trace property
      if (typeof metadata === 'object' && metadata !== null && 'trace' in metadata) {
        traceData = metadata.trace || {};
      }
      
      if (typeof traceData !== 'object' || traceData === null) {
        throw new Error('Invalid trace data format');
      }
      
      // Safely access properties with defaults
      const runId = typeof traceData.runId === 'string' ? traceData.runId : '';
      const sessionId = typeof traceData.sessionId === 'string' ? traceData.sessionId : '';
      const startTime = typeof traceData.startTime === 'string' ? traceData.startTime : '';
      const endTime = typeof traceData.endTime === 'string' ? traceData.endTime : '';
      const events = Array.isArray(traceData.events) ? traceData.events : [];
      
      // Default summary if not available
      let summary = {
        agentTypes: [],
        handoffs: 0,
        toolCalls: 0,
        success: false,
        duration: 0
      };
      
      // Override with actual summary if available
      if (typeof traceData.summary === 'object' && traceData.summary !== null) {
        summary = {
          agentTypes: Array.isArray(traceData.summary.agentTypes) ? traceData.summary.agentTypes : [],
          handoffs: typeof traceData.summary.handoffs === 'number' ? traceData.summary.handoffs : 0,
          toolCalls: typeof traceData.summary.toolCalls === 'number' ? traceData.summary.toolCalls : 0,
          success: Boolean(traceData.summary.success),
          duration: typeof traceData.summary.duration === 'number' ? traceData.summary.duration : 0
        };
      }
      
      // Construct a complete Trace object
      const trace: Trace = {
        id: runId || data.id,
        runId: runId || data.id,
        userId: data?.user_id || '',
        sessionId: sessionId,
        messages: [],
        events: events,
        startTime: startTime,
        endTime: endTime,
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
                        {trace.group_id && (
                          <Badge variant="secondary">{trace.group_id}</Badge>
                        )}
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
};
