
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, BarChart2, PieChart as PieChartIcon, Activity, Zap, Hammer } from "lucide-react";

export interface TraceDashboardProps {
  userId: string;
}

interface AgentAnalytics {
  agent_usage: Record<string, number>;
  total_interactions: number;
  total_conversations: number;
  avg_duration_ms: number;
  success_rate: number;
  total_handoffs: number;
  total_tool_calls: number;
  total_messages: number;
  model_usage: Record<string, number>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#83a6ed'];

export const TraceDashboard: React.FC<TraceDashboardProps> = ({ userId }) => {
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .rpc('get_agent_trace_analytics', { user_id_param: userId }) as any;
        
        if (fetchError) {
          throw fetchError;
        }
        
        setAnalytics(data as AgentAnalytics);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  // Prepare data for charts
  const prepareAgentUsageData = () => {
    if (!analytics?.agent_usage) return [];
    
    return Object.entries(analytics.agent_usage).map(([agent, count]) => ({
      name: agent,
      value: count
    }));
  };
  
  const prepareModelUsageData = () => {
    if (!analytics?.model_usage) return [];
    
    return Object.entries(analytics.model_usage).map(([model, count]) => ({
      name: model,
      value: count
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading analytics data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <div className="p-4 border rounded-md bg-card">
        <h2 className="text-xl font-semibold mb-4">No analytics data available</h2>
        <p className="text-sm text-muted-foreground">
          Start using the multi-agent chat to generate trace data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 text-blue-500 mr-2" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_conversations}</div>
            <p className="text-xs text-muted-foreground">
              Total agent conversations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 text-green-500 mr-2" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.success_rate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Successful completions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart2 className="h-4 w-4 text-yellow-500 mr-2" />
              Handoffs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_handoffs}</div>
            <p className="text-xs text-muted-foreground">
              Agent to agent transfers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Hammer className="h-4 w-4 text-purple-500 mr-2" />
              Tool Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_tool_calls}</div>
            <p className="text-xs text-muted-foreground">
              Function executions
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="agent-usage">
        <TabsList className="mb-4">
          <TabsTrigger value="agent-usage">Agent Usage</TabsTrigger>
          <TabsTrigger value="model-usage">Model Usage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agent-usage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Agent Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareAgentUsageData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareAgentUsageData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [`${value} uses`, props.payload.name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="model-usage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart2 className="h-5 w-5 mr-2" />
                LLM Model Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareModelUsageData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Usage Count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Average Duration</h3>
              <p className="text-2xl font-bold">
                {(analytics.avg_duration_ms / 1000).toFixed(2)}s
              </p>
              <p className="text-xs text-muted-foreground">
                Average time to complete a request
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Messages</h3>
              <p className="text-2xl font-bold">
                {analytics.total_messages}
              </p>
              <p className="text-xs text-muted-foreground">
                Total messages processed
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Avg. Handoffs per Conversation</h3>
              <p className="text-2xl font-bold">
                {analytics.total_conversations > 0 
                  ? (analytics.total_handoffs / analytics.total_conversations).toFixed(1) 
                  : '0'}
              </p>
              <p className="text-xs text-muted-foreground">
                Agent transfers per conversation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
