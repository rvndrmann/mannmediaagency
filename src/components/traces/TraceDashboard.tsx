import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart as BarChartIcon, 
  Handshake, 
  LayoutGrid, 
  MessageSquare, 
  Timer, 
  Wrench 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AgentAnalytics } from '@/integrations/supabase/rpc-types';
import { toast } from 'sonner';

interface TraceDashboardProps {
  userId: string;
}

export function TraceDashboard({ userId }: TraceDashboardProps) {
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colors = [
    '#4f46e5', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
    '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0',
  ];

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching analytics for user:', userId);
        
        // Use rpc() method with type parameter 
        const { data, error: fetchError } = await supabase
          .rpc<AgentAnalytics>('get_agent_trace_analytics', { user_id_param: userId });
        
        if (fetchError) {
          console.error("RPC error:", fetchError);
          throw fetchError;
        }
        
        if (!data) {
          throw new Error('No data returned from analytics function');
        }
        
        console.log('Analytics data:', data);
        setAnalytics(data);
      } catch (err: any) {
        console.error("Error fetching analytics:", err);
        setError('Failed to load analytics data. Please try again later.');
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 text-red-500 rounded-lg">
        <p className="font-medium">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const formatChartData = (data: Record<string, number> | undefined) => {
    if (!data) return [];
    
    return Object.entries(data).map(([name, count]) => ({
      name: name || 'Unknown',
      count
    }));
  };
  
  const agentUsageData = formatChartData(analytics.agent_usage);
  const modelUsageData = formatChartData(analytics.model_usage);

  const StatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ElementType; 
    description?: string 
  }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Traces"
          value={analytics.total_traces || 0}
          icon={BarChartIcon}
          description="Agent conversation sessions"
        />
        
        <StatsCard
          title="Total Messages"
          value={analytics.total_messages || 0}
          icon={MessageSquare}
          description="User and AI interactions"
        />
        
        <StatsCard
          title="Handoffs"
          value={analytics.total_handoffs || 0}
          icon={Handshake}
          description="Agent to agent transfers"
        />
        
        <StatsCard
          title="Tool Calls"
          value={analytics.total_tool_calls || 0}
          icon={Wrench}
          description="External tool executions"
        />
        
        <StatsCard
          title="Avg Response Time"
          value={`${((analytics.avg_response_time || 0) / 1000).toFixed(2)}s`}
          icon={Timer}
          description="Average agent response time"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Agent Usage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {agentUsageData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No agent usage data available</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={agentUsageData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60} 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                      {agentUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Model Usage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {modelUsageData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No model usage data available</p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={modelUsageData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60} 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]}>
                      {modelUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[5 + (index % 5)]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
