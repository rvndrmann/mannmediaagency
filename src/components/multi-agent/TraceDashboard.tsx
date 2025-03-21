import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
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

interface ConversationData {
  conversation_id: string;
  start_time: string;
  end_time: string;
  message_count: number;
  agent_types: string[];
  model_used: string;
}

interface TraceDashboardProps {
  userId?: string;
}

export const TraceDashboard = ({ userId }: TraceDashboardProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Use provided userId or get the current authenticated user
        let userIdToUse = userId;
        if (!userIdToUse) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          userIdToUse = user.id;
        }

        // Fetch analytics data
        const { data: analyticsData, error: analyticsError } = await supabase
          .from("agent_trace_analytics")
          .rpc("get_agent_trace_analytics", { user_id_param: userIdToUse });

        if (analyticsError) {
          console.error("Error fetching analytics:", analyticsError);
        } else if (analyticsData) {
          // Type assertion to ensure the data is of type AnalyticsData
          setAnalytics(analyticsData as AnalyticsData);
        }

        // Fetch conversation list
        const { data: convoData, error: convoError } = await supabase
          .from("user_conversations")
          .rpc("get_user_conversations", { user_id_param: userIdToUse });

        if (convoError) {
          console.error("Error fetching conversations:", convoError);
        } else if (convoData) {
          setConversations(Array.isArray(convoData) ? convoData as ConversationData[] : []);
        }
      } catch (error) {
        console.error("Error in data fetching:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const fetchConversationDetail = async (conversationId: string) => {
    try {
      // Use provided userId or get the current authenticated user
      let userIdToUse = userId;
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        userIdToUse = user.id;
      }

      const { data, error } = await supabase
        .from("conversation_trace")
        .rpc("get_conversation_trace", { 
          conversation_id: conversationId,
          user_id_param: userIdToUse
        });

      if (error) {
        console.error("Error fetching conversation detail:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in conversation detail fetching:", error);
      return null;
    }
  };

  // Prepare agent usage data for the chart
  const agentUsageData = analytics?.agent_usage 
    ? Object.entries(analytics.agent_usage).map(([agent, count]) => ({
        name: agent,
        value: count
      }))
    : [];

  // Colors for the pie chart
  const COLORS = [
    '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', 
    '#d0ed57', '#ffc658', '#ff8042', '#ff5252', '#757de8'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_conversations || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Agent Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_interactions || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Handoffs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_handoffs || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tool Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_tool_calls || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Agent Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {agentUsageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agentUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {agentUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, `Agent: ${name}`]} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No agent usage data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.slice(0, 5).map((convo) => (
                  <div key={convo.conversation_id} className="border-b pb-2">
                    <div className="flex justify-between">
                      <div className="font-medium text-sm">
                        {new Date(convo.start_time).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {convo.message_count} messages
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Agents: {convo.agent_types.join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Model: {convo.model_used}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-center">
                  No conversation history available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
