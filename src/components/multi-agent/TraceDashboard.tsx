
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChartBig, Clock, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { TraceViewer } from './TraceViewer';
import { format } from 'date-fns';
import { AnalyticsData, ConversationData, TraceData } from '@/types/message';

interface TraceDashboardProps {
  userId: string;
}

export const TraceDashboard = ({ userId }: TraceDashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTraceLoading, setIsTraceLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    total_conversations: 0,
    total_handoffs: 0,
    total_tool_calls: 0,
    average_duration: 0,
    agent_usage: {},
    conversations_by_day: {}
  });
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        
        // For now, fetch conversations directly from agent_interactions table
        const { data: interactionsData, error: interactionsError } = await supabase
          .from('agent_interactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (interactionsError) throw interactionsError;
        
        // Process the interactions data into conversations
        const conversationMap: Record<string, ConversationData> = {};
        
        interactionsData.forEach((interaction: any) => {
          const conversationId = interaction.group_id || interaction.id;
          
          if (!conversationMap[conversationId]) {
            conversationMap[conversationId] = {
              id: conversationId,
              user_id: userId,
              conversation_id: conversationId,
              timestamp: interaction.created_at,
              agent_types: [interaction.agent_type || 'unknown'],
              duration: 0,
              messages_count: 1,
              has_handoffs: false,
              has_tool_calls: false
            };
          } else {
            conversationMap[conversationId].messages_count += 1;
            if (!conversationMap[conversationId].agent_types.includes(interaction.agent_type)) {
              conversationMap[conversationId].agent_types.push(interaction.agent_type || 'unknown');
            }
          }
        });
        
        const conversationsList = Object.values(conversationMap);
        setConversations(conversationsList);
        
        // Calculate simple analytics
        const agentUsage: Record<string, number> = {};
        let totalHandoffs = 0;
        let totalToolCalls = 0;
        
        conversationsList.forEach(conv => {
          if (conv.agent_types.length > 1) {
            totalHandoffs += conv.agent_types.length - 1;
          }
          
          conv.agent_types.forEach(agent => {
            agentUsage[agent] = (agentUsage[agent] || 0) + 1;
          });
        });
        
        const byDay: Record<string, number> = {};
        conversationsList.forEach(conv => {
          const date = format(new Date(conv.timestamp), 'yyyy-MM-dd');
          byDay[date] = (byDay[date] || 0) + 1;
        });
        
        setAnalyticsData({
          total_conversations: conversationsList.length,
          total_handoffs: totalHandoffs,
          total_tool_calls: 0,  // We don't have this data easily available
          average_duration: 0,  // We don't have this data easily available
          agent_usage: agentUsage,
          conversations_by_day: byDay
        });
        
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  // Fetch trace for a specific conversation
  const fetchTrace = async (conversationId: string) => {
    try {
      setIsTraceLoading(true);
      setSelectedConversation(conversationId);
      
      // Fetch interactions for this conversation
      const { data: interactions, error } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('group_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (!interactions || interactions.length === 0) {
        setTraceData(null);
        return;
      }
      
      // Construct a basic trace data structure from interactions
      const messages = interactions.map((interaction: any) => ({
        role: interaction.role || 'assistant',
        timestamp: interaction.created_at,
        user_message: interaction.role === 'user' ? interaction.content : undefined,
        assistant_response: interaction.role !== 'user' ? interaction.content : undefined,
        agent_type: interaction.agent_type,
        trace: {
          events: [],
          modelUsed: interaction.model_used || 'unknown',
          duration: interaction.duration || 0,
          summary: {
            handoffs: 0,
            toolCalls: 0,
            success: true
          }
        }
      }));
      
      const traceData: TraceData = {
        summary: {
          agent_types: [...new Set(interactions.map((i: any) => i.agent_type))],
          handoffs: 0,
          tool_calls: 0,
          duration: 0,
          success: true
        },
        messages
      };
      
      setTraceData(traceData);
      
    } catch (error) {
      console.error("Error fetching trace:", error);
      setTraceData(null);
    } finally {
      setIsTraceLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.conversation_id.toLowerCase().includes(searchLower) ||
      conv.agent_types.some(agent => agent.toLowerCase().includes(searchLower))
    );
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    return (
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          {selectedConversation && <TabsTrigger value="trace">Trace View</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analyticsData.total_conversations}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg. Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analyticsData.average_duration}s</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChartBig className="h-4 w-4" />
                  Handoffs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analyticsData.total_handoffs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChartBig className="h-4 w-4" />
                  Tool Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analyticsData.total_tool_calls}</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {Object.keys(analyticsData.agent_usage).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(analyticsData.agent_usage).map(([agent, count]) => (
                        <div key={agent} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span>{agent}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <p>No agent usage data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Conversations Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {Object.keys(analyticsData.conversations_by_day).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(analyticsData.conversations_by_day).map(([date, count]) => (
                        <div key={date} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>{date}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <p>No conversation data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="Search by ID or agent type"
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conv) => (
                      <Card 
                        key={conv.id} 
                        className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                        onClick={() => fetchTrace(conv.conversation_id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium">{format(new Date(conv.timestamp), 'MMM dd, yyyy HH:mm')}</div>
                            <div className="text-xs text-gray-400">{conv.conversation_id.slice(0, 8)}</div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>Agents: {conv.agent_types.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BarChartBig className="h-3 w-3" />
                              <span>{conv.messages_count} messages</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                      <p>No conversations found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {selectedConversation && (
          <TabsContent value="trace">
            {isTraceLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              traceData ? (
                <TraceViewer traceData={traceData} conversationId={selectedConversation} />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BarChartBig className="h-12 w-12 text-gray-500 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Trace Data Available</h3>
                    <p className="text-gray-400 text-center max-w-md">
                      There is no trace data available for this conversation or the trace has expired.
                    </p>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
        )}
      </Tabs>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};
