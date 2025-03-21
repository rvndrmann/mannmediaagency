
import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { ArrowLeft, Clock, MessageSquare, Users, Bot } from 'lucide-react';
import { TraceViewer } from './TraceViewer';

interface AnalyticsData {
  agentCounts: { name: string; count: number }[];
  totalInteractions: number;
  uniqueUsers: number;
  averageResponseTime: number;
}

interface ConversationData {
  id: string;
  created_at: string;
  user_id: string;
  message_count: number;
  duration: number;
}

interface TraceData {
  id: string;
  created_at: string;
  data: any;
}

interface AnalyticsResponse {
  agent_counts: { name: string; count: number }[];
  total_interactions: number;
  unique_users: number;
  average_response_time: number;
}

interface TraceDashboardProps {
  userId: string;
}

export const TraceDashboard = ({ userId }: TraceDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    agentCounts: [],
    totalInteractions: 0,
    uniqueUsers: 0,
    averageResponseTime: 0
  });
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationTraces, setConversationTraces] = useState<TraceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Use directly with query instead of RPC
        const { data, error } = await supabase
          .from('agent_trace_analytics')
          .select('*')
          .limit(1)
          .single();
        
        if (error) throw error;
        
        if (data) {
          const analyticsResponse = data as unknown as AnalyticsResponse;
          setAnalyticsData({
            agentCounts: analyticsResponse.agent_counts || [],
            totalInteractions: analyticsResponse.total_interactions || 0,
            uniqueUsers: analyticsResponse.unique_users || 0,
            averageResponseTime: analyticsResponse.average_response_time || 0
          });
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    const fetchConversations = async () => {
      try {
        // Use direct query instead of RPC
        const { data, error } = await supabase
          .from('user_conversations')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          setConversations(data as ConversationData[]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    fetchConversations();
  }, []);

  // Fetch traces for a selected conversation
  const fetchConversationTraces = async (conversationId: string) => {
    try {
      setSelectedConversation(conversationId);
      setLoading(true);
      
      // Use direct query instead of RPC
      const { data, error } = await supabase
        .from('conversation_traces')
        .select('*')
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      
      if (data) {
        setConversationTraces(data as TraceData[]);
      }
    } catch (error) {
      console.error('Error fetching conversation traces:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBackToList = () => {
    setSelectedConversation(null);
    setConversationTraces([]);
  };

  // Format data for the chart
  const chartData = analyticsData.agentCounts.map(item => ({
    name: item.name,
    count: item.count
  }));

  // Generate random colors for the chart
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

  if (selectedConversation) {
    return (
      <div className="p-4">
        <Button 
          variant="outline" 
          onClick={goBackToList} 
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Conversations
        </Button>
        
        {conversationTraces.length > 0 ? (
          <div className="space-y-4">
            {conversationTraces.map((trace) => (
              <TraceViewer 
                key={trace.id} 
                traceData={trace.data} 
                conversationId={selectedConversation}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                {loading ? 'Loading traces...' : 'No traces found for this conversation'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Trace Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analyticsData.totalInteractions}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unique Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analyticsData.uniqueUsers}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {analyticsData.averageResponseTime.toFixed(2)}s
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Agent Usage Distribution</CardTitle>
            <CardDescription>Number of interactions per agent type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Click on a conversation to view its traces</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              {loading ? (
                <p className="text-center text-gray-500 py-4">Loading conversations...</p>
              ) : conversations.length > 0 ? (
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <Button
                      key={conversation.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => fetchConversationTraces(conversation.id)}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          <span className="font-medium">Session: {conversation.id.substring(0, 8)}...</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span>Messages: {conversation.message_count}</span>
                          <span className="mx-2">•</span>
                          <span>Duration: {(conversation.duration / 1000).toFixed(1)}s</span>
                          <span className="mx-2">•</span>
                          <span>
                            {new Date(conversation.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No conversations found</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
