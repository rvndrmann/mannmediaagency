
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, MessageSquare, Zap, ArrowRight, Tool, BarChart, RefreshCw, Check, Timer 
} from 'lucide-react';
import { TraceViewer } from './TraceViewer';
import { formatDistanceToNow, format } from 'date-fns';
import { ConversationData, TraceData } from '@/hooks/multi-agent/types';

export function TraceDashboard() {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTrace, setLoadingTrace] = useState(false);
  
  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('agent_traces')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        
        // Process the data into a format suitable for display
        const conversationData: ConversationData[] = (data || []).map(item => {
          // Safely access metadata properties
          const metadata = item.metadata as Record<string, any> || {};
          const groupId = typeof metadata === 'object' && metadata !== null ? metadata.groupId : null;
          
          // Extract first message if available
          let firstMessage = '';
          try {
            if (item.events && typeof item.events === 'object' && Array.isArray(item.events)) {
              const userMessage = item.events.find((event: any) => 
                event && typeof event === 'object' && event.eventType === 'user_message'
              );
              
              if (userMessage && userMessage.data && typeof userMessage.data === 'object') {
                firstMessage = userMessage.data.content || '';
              }
            }
          } catch (err) {
            console.error('Error extracting first message:', err);
          }
          
          return {
            id: item.id,
            groupId: groupId,
            startTime: item.created_at,
            endTime: item.updated_at || item.created_at,
            duration: item.duration || 0,
            agentTypes: item.agent_types || [],
            messageCount: item.message_count || 0,
            toolCalls: item.tool_calls || 0,
            handoffs: item.handoffs || 0,
            status: item.status || 'completed',
            userId: item.user_id,
            firstMessage
          };
        });
        
        // Group by conversation ID if available
        const groupedConversations: Record<string, ConversationData[]> = {};
        
        conversationData.forEach(conv => {
          if (conv.groupId) {
            if (!groupedConversations[conv.groupId]) {
              groupedConversations[conv.groupId] = [];
            }
            groupedConversations[conv.groupId].push(conv);
          }
        });
        
        // Create final conversation list
        const finalConversations: ConversationData[] = [];
        
        // Add grouped conversations
        Object.entries(groupedConversations).forEach(([groupId, convs]) => {
          // Take the most recent one as the representative
          const latestConv = convs.sort((a, b) => 
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )[0];
          
          finalConversations.push({
            ...latestConv,
            messageCount: convs.reduce((sum, c) => sum + c.messageCount, 0),
            toolCalls: convs.reduce((sum, c) => sum + c.toolCalls, 0),
            handoffs: convs.reduce((sum, c) => sum + c.handoffs, 0),
          });
        });
        
        // Add individual conversations (ones without groupId)
        conversationData
          .filter(conv => !conv.groupId)
          .forEach(conv => finalConversations.push(conv));
        
        // Sort by start time
        finalConversations.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        
        setConversations(finalConversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchConversations();
  }, []);
  
  // Fetch trace data for a selected conversation
  const fetchTraceData = async (traceId: string) => {
    try {
      setLoadingTrace(true);
      setSelectedConversation(traceId);
      
      const { data, error } = await supabase
        .from('agent_traces')
        .select('*')
        .eq('id', traceId)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        throw new Error('Trace not found');
      }
      
      // Process events
      const events = data.events || [];
      const metadata = data.metadata || {};
      const modelUsed = typeof metadata === 'object' && metadata !== null ? 
        metadata.modelUsed || 'Unknown' : 'Unknown';
      
      // Create trace data structure
      const trace: TraceData = {
        id: data.id,
        events: events.map((event: any) => ({
          id: event.id || `event-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: event.timestamp || Date.now(),
          agentType: event.agentType || 'unknown',
          eventType: event.eventType || 'unknown',
          data: event.data || {}
        })),
        summary: {
          startTime: new Date(data.created_at).getTime(),
          endTime: new Date(data.updated_at || data.created_at).getTime(),
          duration: data.duration || 0,
          agentTypes: data.agent_types || [],
          userId: data.user_id,
          success: data.status === 'completed',
          toolCalls: data.tool_calls || 0,
          handoffs: data.handoffs || 0,
          messageCount: data.message_count || 0,
          modelUsed
        }
      };
      
      setTraceData(trace);
    } catch (error) {
      console.error('Error fetching trace data:', error);
    } finally {
      setLoadingTrace(false);
    }
  };
  
  // Calculate stats for display
  const stats = useMemo(() => {
    if (!conversations.length) return null;
    
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messageCount, 0);
    const totalToolCalls = conversations.reduce((sum, conv) => sum + conv.toolCalls, 0);
    const totalHandoffs = conversations.reduce((sum, conv) => sum + conv.handoffs, 0);
    
    // Get unique agent types
    const agentTypes = new Set<string>();
    conversations.forEach(conv => {
      (conv.agentTypes || []).forEach(type => agentTypes.add(type));
    });
    
    return {
      conversationCount: conversations.length,
      messageCount: totalMessages,
      toolCallCount: totalToolCalls,
      handoffCount: totalHandoffs,
      agentTypeCount: agentTypes.size
    };
  }, [conversations]);
  
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'user_message':
        return <MessageSquare className="h-4 w-4" />;
      case 'assistant_response':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'tool_call':
        return <Tool className="h-4 w-4 text-blue-500" />;
      case 'handoff':
        return <ArrowRight className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <Clock className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="h-full p-4 lg:p-8">
      <Tabs defaultValue="conversations">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="trace" disabled={!selectedConversation}>
              Trace Viewer
            </TabsTrigger>
          </TabsList>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <TabsContent value="conversations" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            {stats && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Conversations
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.conversationCount}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Messages
                    </CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.messageCount}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tool Calls
                    </CardTitle>
                    <Tool className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.toolCallCount}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Handoffs
                    </CardTitle>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.handoffCount}</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>
                Your most recent AI agent interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No conversations found
                </div>
              ) : (
                <ScrollArea className="h-[600px] w-full">
                  <div className="space-y-4">
                    {conversations.map((conversation) => (
                      <div 
                        key={conversation.id}
                        className="p-4 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => fetchTraceData(conversation.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium truncate flex-1 mr-4">
                            {conversation.firstMessage || 'Conversation ' + conversation.id.substring(0, 8)}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(conversation.startTime), { addSuffix: true })}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex space-x-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {conversation.messageCount}
                            </Badge>
                            {conversation.toolCalls > 0 && (
                              <Badge variant="outline" className="flex items-center gap-1 text-blue-500">
                                <Tool className="h-3 w-3" />
                                {conversation.toolCalls}
                              </Badge>
                            )}
                            {conversation.handoffs > 0 && (
                              <Badge variant="outline" className="flex items-center gap-1 text-orange-500">
                                <ArrowRight className="h-3 w-3" />
                                {conversation.handoffs}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {conversation.agentTypes && conversation.agentTypes.slice(0, 3).map((agent, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {agent}
                              </Badge>
                            ))}
                            {conversation.agentTypes && conversation.agentTypes.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{conversation.agentTypes.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trace" className="mt-0 space-y-4">
          {loadingTrace ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : traceData ? (
            <TraceViewer traceData={traceData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select a conversation to view its trace
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
