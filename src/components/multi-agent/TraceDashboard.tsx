
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ArrowRight, Calendar, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { TraceViewer } from './TraceViewer';
import { ConversationData, TraceData } from '@/hooks/multi-agent/types';

export function TraceDashboard() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch conversations from Supabase
  const fetchConversations = async () => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // This call will need an implementation in your backend
      const { data, error } = await supabase
        .from('agent_interactions')
        .select('id, timestamp, agent_type, user_message, metadata')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
        return;
      }

      // Group interactions by conversation ID (stored in metadata.groupId)
      const conversationMap = new Map<string, any[]>();
      
      data.forEach(interaction => {
        if (interaction.metadata) {
          // Convert metadata to object if it's not already
          const metadata = typeof interaction.metadata === 'object' 
            ? interaction.metadata 
            : {};
            
          // Check if metadata has groupId property
          if (metadata && typeof metadata === 'object' && 'groupId' in metadata) {
            const groupId = String(metadata.groupId || '');
            if (groupId) {
              if (!conversationMap.has(groupId)) {
                conversationMap.set(groupId, []);
              }
              conversationMap.get(groupId)!.push(interaction);
            }
          }
        }
      });
      
      // Convert map to conversation objects
      const conversationList: ConversationData[] = Array.from(conversationMap.entries())
        .map(([groupId, interactions]) => {
          const sortedInteractions = interactions.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          const firstInteraction = sortedInteractions[0];
          const lastInteraction = sortedInteractions[sortedInteractions.length - 1];
          
          const agentTypes = [...new Set(interactions.map(i => i.agent_type))];
          
          return {
            id: groupId,
            startTime: firstInteraction.timestamp,
            endTime: lastInteraction.timestamp,
            duration: new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime(),
            agentTypes,
            messageCount: interactions.length,
            toolCalls: interactions.filter(i => {
              const metadata = typeof i.metadata === 'object' ? i.metadata : {};
              return metadata && typeof metadata === 'object' && 'toolCalls' in metadata;
            }).length,
            handoffs: interactions.filter(i => {
              const metadata = typeof i.metadata === 'object' ? i.metadata : {};
              return metadata && typeof metadata === 'object' && 'handoffs' in metadata;
            }).length,
            status: 'completed',
            userId: user.id,
            firstMessage: firstInteraction.user_message
          };
        });
      
      setConversations(conversationList);
    } catch (error) {
      console.error('Error processing conversation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch trace data for a specific conversation
  const fetchTraceData = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // This call will need an implementation in your backend
      const { data, error } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('metadata->groupId', conversationId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching trace data:', error);
        return;
      }

      // Transform into trace data format
      const events = data.map((interaction, index) => ({
        id: interaction.id,
        timestamp: new Date(interaction.timestamp).getTime(),
        agentType: interaction.agent_type,
        eventType: (index % 2 === 0 ? 'user_message' : 'assistant_response') as 'user_message' | 'assistant_response' | 'tool_call' | 'handoff' | 'error',
        data: {
          content: index % 2 === 0 ? interaction.user_message : interaction.assistant_response,
          ...(typeof interaction.metadata === 'object' ? interaction.metadata : {})
        }
      }));

      // Get metadata from the first interaction, ensuring it's an object
      const firstInteractionMetadata = typeof data[0]?.metadata === 'object' 
        ? data[0].metadata 
        : {};

      // Create the trace data object
      const traceData: TraceData = {
        id: conversationId,
        events,
        summary: {
          startTime: events[0]?.timestamp || Date.now(),
          endTime: events[events.length - 1]?.timestamp || Date.now(),
          duration: events.length > 0 
            ? events[events.length - 1].timestamp - events[0].timestamp 
            : 0,
          agentTypes: [...new Set(events.map(e => e.agentType))],
          userId: user.id,
          success: true,
          toolCalls: events.filter(e => e.eventType === 'tool_call').length,
          handoffs: events.filter(e => e.eventType === 'handoff').length,
          messageCount: events.length,
          modelUsed: firstInteractionMetadata && typeof firstInteractionMetadata === 'object' && 
                    'modelUsed' in firstInteractionMetadata
            ? String(firstInteractionMetadata.modelUsed || 'Unknown')
            : 'Unknown'
        }
      };

      setTraceData(traceData);
    } catch (error) {
      console.error('Error processing trace data:', error);
    }
  };

  // Handle view trace action
  const handleViewTrace = (conversation: ConversationData) => {
    setSelectedConversation(conversation);
    fetchTraceData(conversation.id);
  };

  // Prepare data for charts
  const formatChartData = () => {
    const agentUsage: Record<string, number> = {};
    
    conversations.forEach(conv => {
      conv.agentTypes.forEach(type => {
        agentUsage[type] = (agentUsage[type] || 0) + 1;
      });
    });
    
    return Object.entries(agentUsage).map(([name, value]) => ({ name, value }));
  };

  // Defining chart colors based on agent type
  const AGENT_COLORS: Record<string, string> = {
    main: '#3B82F6',
    script: '#F59E0B',
    image: '#8B5CF6',
    tool: '#10B981',
    scene: '#EC4899',
    default: '#64748B'
  };

  // Format duration for display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-6">
      {!selectedConversation ? (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Trace Analytics</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchConversations} disabled={isLoading}>
                Refresh Data
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-[400px]">
              <TabsTrigger value="conversations">
                <Calendar className="h-4 w-4 mr-2" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart2 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="conversations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableCaption>A list of your recent conversations with AI agents.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">First Message</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Messages</TableHead>
                        <TableHead>Agents</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversations.map(conversation => (
                        <TableRow key={conversation.id}>
                          <TableCell className="font-medium truncate max-w-[250px]">
                            {conversation.firstMessage || "—"}
                          </TableCell>
                          <TableCell>
                            {new Date(conversation.startTime).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {formatDuration(conversation.duration)}
                          </TableCell>
                          <TableCell>{conversation.messageCount}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {conversation.agentTypes.map(agent => (
                                <span 
                                  key={agent}
                                  className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800"
                                >
                                  {agent}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewTrace(conversation)}
                            >
                              View <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {conversations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            {isLoading ? "Loading conversations..." : "No conversations found."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChartIcon className="h-4 w-4 mr-2" />
                      Agent Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {formatChartData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={formatChartData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {formatChartData().map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={AGENT_COLORS[entry.name as keyof typeof AGENT_COLORS] || AGENT_COLORS.default} 
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Conversation Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Conversations</span>
                        <span className="font-medium">{conversations.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Message Count</span>
                        <span className="font-medium">
                          {conversations.length > 0 
                            ? (conversations.reduce((sum, conv) => sum + conv.messageCount, 0) / conversations.length).toFixed(1)
                            : "—"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Tool Calls</span>
                        <span className="font-medium">
                          {conversations.reduce((sum, conv) => sum + (conv.toolCalls || 0), 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Handoffs</span>
                        <span className="font-medium">
                          {conversations.reduce((sum, conv) => sum + (conv.handoffs || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedConversation(null);
                setTraceData(null);
              }}
            >
              Back to Analytics
            </Button>
            <h2 className="text-xl font-semibold">
              Conversation Trace
            </h2>
          </div>
          
          {traceData ? (
            <TraceViewer trace={traceData} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <h3 className="font-medium">Loading trace data...</h3>
                  <p className="text-sm text-muted-foreground">Please wait</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
