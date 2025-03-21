
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Separator } from "@/components/ui/separator";
import { TraceViewer } from "./TraceViewer";
import { format } from 'date-fns';
import { BarChartBig, Clock, Hammer, Repeat, Users, Zap } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#70D6FF'];

type AnalyticsData = {
  agent_usage: Record<string, number>;
  total_interactions: number;
  total_conversations: number;
  avg_duration_ms: number;
  success_rate: number;
  total_handoffs: number;
  total_tool_calls: number;
  model_usage: Record<string, number>;
};

type ConversationData = {
  conversation_id: string;
  start_time: string;
  end_time: string;
  message_count: number;
  agent_types: string[];
};

export const TraceDashboard = ({ userId }: { userId: string }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [traceDetails, setTraceDetails] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      try {
        // Fetch analytics data using a regular query instead of RPC
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('agent_interactions')
          .select(`
            agent_type,
            created_at,
            metadata
          `)
          .eq('user_id', userId);
        
        if (analyticsError) {
          console.error("Error fetching analytics:", analyticsError);
        } else {
          // Process analytics data manually
          const processedData: AnalyticsData = {
            agent_usage: {},
            model_usage: {},
            total_interactions: analyticsData?.length || 0,
            total_conversations: 0,
            avg_duration_ms: 0,
            success_rate: 0,
            total_handoffs: 0,
            total_tool_calls: 0
          };
          
          // Count agent types
          analyticsData?.forEach(interaction => {
            // Count agent usage
            const agentType = interaction.agent_type;
            if (agentType) {
              processedData.agent_usage[agentType] = (processedData.agent_usage[agentType] || 0) + 1;
            }
            
            // Count model usage if available in metadata
            const modelUsed = interaction.metadata?.trace?.summary?.modelUsed;
            if (modelUsed) {
              processedData.model_usage[modelUsed] = (processedData.model_usage[modelUsed] || 0) + 1;
            }
            
            // Count tool calls and handoffs if available
            const toolCalls = interaction.metadata?.trace?.summary?.toolCalls || 0;
            const handoffs = interaction.metadata?.trace?.summary?.handoffs || 0;
            
            processedData.total_tool_calls += toolCalls;
            processedData.total_handoffs += handoffs;
          });
          
          // Count unique conversations by grouping by runId
          const runIds = new Set<string>();
          let totalDuration = 0;
          
          analyticsData?.forEach(interaction => {
            const runId = interaction.metadata?.trace?.runId;
            const duration = interaction.metadata?.trace?.duration || 0;
            
            if (runId && !runIds.has(runId)) {
              runIds.add(runId);
              totalDuration += duration;
            }
          });
          
          processedData.total_conversations = runIds.size;
          processedData.avg_duration_ms = runIds.size > 0 ? totalDuration / runIds.size : 0;
          
          setAnalytics(processedData);
        }
        
        // Fetch conversations list using a regular query
        const { data: conversationsRawData, error: conversationsError } = await supabase
          .from('agent_interactions')
          .select(`
            metadata,
            created_at
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (conversationsError) {
          console.error("Error fetching conversations:", conversationsError);
        } else {
          // Process conversations data
          const conversationMap = new Map<string, ConversationData>();
          
          conversationsRawData?.forEach(interaction => {
            const runId = interaction.metadata?.trace?.runId;
            if (!runId) return;
            
            if (!conversationMap.has(runId)) {
              // Create new conversation entry
              const agentTypes = interaction.metadata?.trace?.summary?.agentTypes || [];
              const startTime = new Date(interaction.metadata?.trace?.summary?.startTime || interaction.created_at).toISOString();
              const endTime = new Date(interaction.metadata?.trace?.summary?.endTime || interaction.created_at).toISOString();
              const messageCount = interaction.metadata?.trace?.summary?.messageCount || 0;
              
              conversationMap.set(runId, {
                conversation_id: runId,
                start_time: startTime,
                end_time: endTime,
                message_count: messageCount,
                agent_types: agentTypes
              });
            }
          });
          
          setConversations(Array.from(conversationMap.values()));
        }
      } catch (error) {
        console.error("Error in analytics fetch:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [userId]);
  
  const fetchConversationDetails = async (conversationId: string) => {
    try {
      // Fetch trace details using a regular query
      const { data, error } = await supabase
        .from('agent_interactions')
        .select(`
          metadata,
          created_at,
          user_message,
          assistant_response
        `)
        .eq('user_id', userId)
        .filter('metadata->trace->runId', 'eq', conversationId);
      
      if (error) {
        console.error("Error fetching conversation details:", error);
      } else {
        // Extract trace data from metadata
        const traceData = data?.map(item => ({
          ...item.metadata?.trace,
          user_message: item.user_message,
          assistant_response: item.assistant_response,
          created_at: item.created_at
        }));
        
        setTraceDetails(traceData);
        setSelectedConversation(conversationId);
        setActiveTab("details");
      }
    } catch (error) {
      console.error("Error in conversation details fetch:", error);
    }
  };
  
  // Format agent usage data for pie chart
  const prepareAgentUsageData = () => {
    if (!analytics?.agent_usage) return [];
    
    return Object.entries(analytics.agent_usage).map(([name, value]) => ({
      name,
      value
    }));
  };
  
  // Format model usage data for pie chart
  const prepareModelUsageData = () => {
    if (!analytics?.model_usage) return [];
    
    return Object.entries(analytics.model_usage).map(([name, value]) => ({
      name: name === 'gpt-4o-mini' ? 'GPT-4o mini' : name === 'gpt-4o' ? 'GPT-4o' : name,
      value
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Agent Analytics</h1>
      <p className="text-gray-400">View detailed analytics about your agent interactions and trace information.</p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Conversation Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.total_conversations || 0}</div>
                <p className="text-xs text-gray-500 mt-1">Across {analytics?.total_interactions || 0} interactions</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.avg_duration_ms 
                    ? `${(analytics.avg_duration_ms / 1000).toFixed(1)}s` 
                    : 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Per conversation</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Handoff Rate</CardTitle>
                <Repeat className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.total_handoffs && analytics?.total_conversations
                    ? `${(analytics.total_handoffs / analytics.total_conversations).toFixed(2)}`
                    : '0'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Handoffs per conversation</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
                <Hammer className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.total_tool_calls || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">Total tool calls</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Usage Distribution</CardTitle>
                <CardDescription>Which agents are used most frequently</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareAgentUsageData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareAgentUsageData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Model Usage</CardTitle>
                <CardDescription>Distribution of LLM models used</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareModelUsageData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareModelUsageData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Conversations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>Your latest agent conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No conversations yet</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-4 text-xs uppercase text-gray-400">Started</th>
                          <th className="text-left py-2 px-4 text-xs uppercase text-gray-400">Duration</th>
                          <th className="text-left py-2 px-4 text-xs uppercase text-gray-400">Messages</th>
                          <th className="text-left py-2 px-4 text-xs uppercase text-gray-400">Agents</th>
                          <th className="text-left py-2 px-4 text-xs uppercase text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversations.slice(0, 10).map((conversation) => {
                          const startTime = new Date(conversation.start_time);
                          const endTime = new Date(conversation.end_time);
                          const durationMs = endTime.getTime() - startTime.getTime();
                          const durationText = durationMs < 60000 
                            ? `${Math.round(durationMs / 1000)}s` 
                            : `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
                          
                          return (
                            <tr 
                              key={conversation.conversation_id} 
                              className="border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer"
                              onClick={() => fetchConversationDetails(conversation.conversation_id)}
                            >
                              <td className="py-3 px-4">{format(startTime, 'MMM dd, HH:mm:ss')}</td>
                              <td className="py-3 px-4">{durationText}</td>
                              <td className="py-3 px-4">{conversation.message_count}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {conversation.agent_types.map((agent, i) => (
                                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-700">
                                      {agent}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <button 
                                  className="text-xs text-blue-500 hover:text-blue-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchConversationDetails(conversation.conversation_id);
                                  }}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="mt-6">
          {selectedConversation && traceDetails ? (
            <TraceViewer traceData={traceDetails} conversationId={selectedConversation} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChartBig className="h-12 w-12 text-gray-500 mb-4" />
                <h3 className="text-xl font-medium mb-2">No Conversation Selected</h3>
                <p className="text-gray-400 text-center max-w-md">
                  Select a conversation from the overview tab to see detailed trace information.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
