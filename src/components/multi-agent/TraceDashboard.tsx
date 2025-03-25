
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TraceViewer } from "./TraceViewer";
import { Trace, calculateDuration, formatDuration } from "@/lib/trace-utils";
import { useAuth } from "@/hooks/use-auth";

interface TraceDashboardProps {
  userId?: string;
}

export function TraceDashboard({ userId }: TraceDashboardProps) {
  const { user } = useAuth();
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);

  const effectiveUserId = userId || (user ? user.id : null);

  useEffect(() => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }
    
    async function fetchTraces() {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('agent_type', 'trace_summary')
        .order('timestamp', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("Error fetching traces:", error);
        setLoading(false);
        return;
      }
      
      // Process the traces
      const processedTraces = data.map(item => {
        // Extract trace data from metadata
        const traceData = item.metadata?.trace || {};
        
        return {
          id: item.id,
          timestamp: item.timestamp,
          runId: traceData.runId || 'unknown',
          summary: traceData.summary || {},
          startTime: traceData.startTime || item.timestamp,
          endTime: traceData.endTime || item.timestamp,
          events: traceData.events || []
        };
      });
      
      setTraces(processedTraces);
      setLoading(false);
    }
    
    fetchTraces();
  }, [effectiveUserId]);

  const viewTrace = async (traceId: string) => {
    if (!effectiveUserId) return;
    
    const { data, error } = await supabase
      .from('agent_interactions')
      .select('metadata')
      .eq('user_id', effectiveUserId)
      .eq('id', traceId)
      .single();
    
    if (error) {
      console.error("Error fetching trace details:", error);
      return;
    }
    
    // Extract trace data
    if (data?.metadata && typeof data.metadata === 'object' && data.metadata.trace) {
      setSelectedTrace(data.metadata.trace as Trace);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Trace Analytics</h1>
      
      {selectedTrace ? (
        <div>
          <Button
            variant="outline"
            onClick={() => setSelectedTrace(null)}
            className="mb-4"
          >
            Back to Traces
          </Button>
          <TraceViewer trace={selectedTrace} />
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : traces.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No traces found. Use the multi-agent chat to generate traces.
            </div>
          ) : (
            <div className="bg-[#21283B]/80 border border-white/10 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-[#2D3648]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Agents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Handoffs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tool Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {traces.map((trace) => (
                    <tr key={trace.id} className="hover:bg-[#2D3648]/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(trace.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {trace.summary?.agentTypes?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {trace.summary?.handoffs || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {trace.summary?.toolCalls || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDuration(calculateDuration(trace.startTime, trace.endTime))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trace.summary?.success 
                            ? 'bg-green-800/50 text-green-300' 
                            : 'bg-red-800/50 text-red-300'
                        }`}>
                          {trace.summary?.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => viewTrace(trace.id)}
                          className="hover:text-blue-400 hover:bg-blue-900/20"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
