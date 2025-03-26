
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
  group_id?: string;
  metadata: any;
  runId: string;
  summary: any;
  startTime: string;
  endTime: string;
  events: any[];
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
      
      // Process the data to extract trace information
      const processedTraces = (data || []).map(item => {
        // Safely access nested metadata.trace properties
        const metadata = item.metadata || {};
        const traceData = metadata.trace || {};
        
        return {
          id: item.id,
          timestamp: item.timestamp,
          group_id: item.group_id || '',
          metadata: item.metadata,
          // Safely extract trace properties
          runId: traceData.runId || '',
          summary: traceData.summary || {},
          startTime: traceData.startTime || '',
          endTime: traceData.endTime || '',
          events: traceData.events || [],
        };
      });
      
      setTraces(processedTraces);
    } catch (error) {
      console.error('Error fetching traces:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const viewTraceDetails = async (traceRunId: string) => {
    try {
      // Get the full trace data
      const { data, error } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('agent_type', 'trace_summary')
        .filter('metadata->trace->runId', 'eq', traceRunId)
        .single();
      
      if (error) throw error;
      
      // Safely extract the trace data
      const metadata = data?.metadata || {};
      const traceData = metadata.trace || {};
      
      // Construct a complete Trace object
      const trace: Trace = {
        id: traceData.runId || '',
        runId: traceData.runId || '',
        userId: data?.user_id || '',
        sessionId: traceData.sessionId || '',
        messages: [],
        events: traceData.events || [],
        startTime: traceData.startTime || '',
        endTime: traceData.endTime || '',
        summary: traceData.summary || {
          agentTypes: [],
          handoffs: 0,
          toolCalls: 0,
          success: false,
          duration: 0
        }
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
                        <h3 className="text-lg font-medium">{trace.runId}</h3>
                        <p className="text-sm text-gray-500">
                          Created {formatDistanceToNow(new Date(trace.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <Badge variant="secondary">{trace.group_id}</Badge>
                      </div>
                      <div>
                        <Button variant="outline" size="sm" onClick={() => viewTraceDetails(trace.runId)}>
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
