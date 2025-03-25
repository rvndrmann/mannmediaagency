
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trace } from '@/lib/trace-utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { formatTraceTimestamp } from '@/lib/trace-utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Bot, Clock, MessageSquare, BarChart2, ArrowRight, Globe, Zap, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface TraceSummary {
  id: string;
  runId: string;
  sessionId: string;
  agentTypes: string[];
  handoffs: number;
  toolCalls: number;
  success: boolean;
  startTime: string;
  endTime: string | null;
  duration: number;
  messageCount: number;
}

type TraceData = {
  id: string;
  runId: string;
  sessionId: string;
  startTime: string;
  endTime: string | null;
  summary: {
    agentTypes: string[];
    handoffs: number;
    toolCalls: number;
    success: boolean;
    duration: number;
    messageCount: number;
  };
};

export const TraceDashboard = () => {
  const { user } = useAuth();
  const [traceData, setTraceData] = useState<TraceSummary[]>([]);
  const [statistics, setStatistics] = useState({
    totalTraces: 0,
    successfulTraces: 0,
    failedTraces: 0,
    averageDuration: 0,
    totalHandoffs: 0,
    totalToolCalls: 0,
    agentUsage: [] as { name: string; count: number }[],
  });
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTraceData();
    }
  }, [user]);

  const fetchTraceData = async () => {
    try {
      setLoading(true);
      const { data: interactions, error } = await supabase
        .from('agent_interactions')
        .select('id, metadata, timestamp')
        .eq('agent_type', 'trace_summary')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching trace data:', error);
        return;
      }

      // Process the interactions to extract trace data
      const traces: TraceSummary[] = interactions
        .filter(interaction => {
          // Safely check if metadata.trace exists
          if (!interaction.metadata) return false;
          
          // Handle different metadata types (string or object)
          const metadata = typeof interaction.metadata === 'string' 
            ? JSON.parse(interaction.metadata) 
            : interaction.metadata;
            
          return metadata && typeof metadata === 'object' && 'trace' in metadata;
        })
        .map(interaction => {
          // Safely extract trace data
          const metadata = typeof interaction.metadata === 'string' 
            ? JSON.parse(interaction.metadata) 
            : interaction.metadata;
            
          const trace = metadata.trace as TraceData;
          
          return {
            id: trace.runId || interaction.id,
            runId: trace.runId || interaction.id,
            sessionId: trace.sessionId || '',
            agentTypes: trace.summary?.agentTypes || [],
            handoffs: trace.summary?.handoffs || 0,
            toolCalls: trace.summary?.toolCalls || 0,
            success: trace.summary?.success || false,
            startTime: trace.startTime || interaction.timestamp,
            endTime: trace.endTime || null,
            duration: trace.summary?.duration || 0,
            messageCount: trace.summary?.messageCount || 0
          };
        });

      setTraceData(traces);
      calculateStatistics(traces);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchTraceData:', error);
      setLoading(false);
    }
  };

  const calculateStatistics = (traces: TraceSummary[]) => {
    if (!traces.length) return;

    const totalDuration = traces.reduce((acc, trace) => acc + (trace.duration || 0), 0);
    const averageDuration = totalDuration / traces.length;
    const successfulTraces = traces.filter(trace => trace.success).length;
    const totalHandoffs = traces.reduce((acc, trace) => acc + (trace.handoffs || 0), 0);
    const totalToolCalls = traces.reduce((acc, trace) => acc + (trace.toolCalls || 0), 0);

    // Calculate agent usage
    const agentCounts: Record<string, number> = {};
    traces.forEach(trace => {
      trace.agentTypes.forEach(agent => {
        agentCounts[agent] = (agentCounts[agent] || 0) + 1;
      });
    });

    const agentUsage = Object.entries(agentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setStatistics({
      totalTraces: traces.length,
      successfulTraces,
      failedTraces: traces.length - successfulTraces,
      averageDuration,
      totalHandoffs,
      totalToolCalls,
      agentUsage,
    });
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'main':
        return <Bot size={16} />;
      case 'script':
        return <MessageSquare size={16} />;
      case 'image':
        return <Zap size={16} />;
      case 'tool':
        return <Wrench size={16} />;
      case 'browser':
        return <Globe size={16} />;
      default:
        return <Bot size={16} />;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  const chartData = statistics.agentUsage.map(agent => ({
    name: agent.name,
    count: agent.count,
  }));

  return (
    <div className="container mx-auto p-4 bg-gradient-to-b from-[#1A1F29] to-[#121827] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Multi-Agent Trace Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-[#21283B]/60 backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Traces</p>
              <p className="text-2xl font-bold">{statistics.totalTraces}</p>
            </div>
            <BarChart2 className="h-8 w-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 bg-[#21283B]/60 backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold">
                {statistics.totalTraces
                  ? Math.round((statistics.successfulTraces / statistics.totalTraces) * 100)
                  : 0}
                %
              </p>
            </div>
            <Zap className="h-8 w-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 bg-[#21283B]/60 backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Handoffs</p>
              <p className="text-2xl font-bold">{statistics.totalHandoffs}</p>
            </div>
            <ArrowRight className="h-8 w-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-4 bg-[#21283B]/60 backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg. Duration</p>
              <p className="text-2xl font-bold">{formatDuration(statistics.averageDuration)}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-400" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-1 p-4 bg-[#21283B]/60 backdrop-blur-sm border border-white/10">
          <h2 className="text-lg font-semibold mb-4">Agent Usage</h2>
          <div className="h-[300px]">
            {statistics.agentUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#21283B', border: '1px solid #444', borderRadius: '4px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No data available</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="col-span-2 p-4 bg-[#21283B]/60 backdrop-blur-sm border border-white/10">
          <h2 className="text-lg font-semibold mb-4">Recent Trace Sessions</h2>
          <ScrollArea className="h-[300px] pr-4">
            {traceData.length > 0 ? (
              <div className="space-y-2">
                {traceData.map((trace) => (
                  <div
                    key={trace.id}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedTrace === trace.id
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'bg-[#2A3141]/80 hover:bg-[#2A3141] border border-white/5'
                    }`}
                    onClick={() => setSelectedTrace(trace.id === selectedTrace ? null : trace.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Session {trace.sessionId.substring(0, 8)}...</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              trace.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                            }`}
                          >
                            {trace.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTraceTimestamp(trace.startTime)} • {formatDuration(trace.duration)}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        {trace.agentTypes.slice(0, 3).map((agent, index) => (
                          <div
                            key={`${trace.id}-${agent}-${index}`}
                            className="h-6 w-6 rounded-full bg-[#2D3240] flex items-center justify-center"
                            title={agent}
                          >
                            {getAgentIcon(agent)}
                          </div>
                        ))}
                        {trace.agentTypes.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-[#2D3240] flex items-center justify-center text-xs">
                            +{trace.agentTypes.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedTrace === trace.id && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Messages:</span> {trace.messageCount}
                          </div>
                          <div>
                            <span className="text-gray-400">Handoffs:</span> {trace.handoffs}
                          </div>
                          <div>
                            <span className="text-gray-400">Tool Calls:</span> {trace.toolCalls}
                          </div>
                          <div>
                            <span className="text-gray-400">Agents Used:</span> {trace.agentTypes.length}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-400">Agents:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {trace.agentTypes.map((agent, index) => (
                              <span
                                key={`detail-${agent}-${index}`}
                                className="px-2 py-0.5 text-xs rounded-full bg-[#2D3240] text-white/70 flex items-center gap-1"
                              >
                                {getAgentIcon(agent)} {agent}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">{loading ? 'Loading traces...' : 'No trace data available'}</p>
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      <div className="text-center mt-4">
        <Button
          variant="outline"
          onClick={fetchTraceData}
          disabled={loading}
          className="border-gray-600 text-white hover:bg-gray-700"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>
    </div>
  );
};
