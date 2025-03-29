
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { TraceViewer } from '@/components/multi-agent/TraceViewer';
import { TraceDashboard } from '@/components/traces/TraceDashboard';
import { Loader2, BarChart, ListFilter, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Conversation {
  conversation_id: string;
  start_time: string; 
  end_time: string;
  message_count: number;
  agent_types: string[];
  model_used: string;
}

interface TraceData {
  messages: any[];
  summary: {
    agent_types: string[];
    duration: number;
    handoffs: number;
    tool_calls: number;
    message_count: number;
    model_used: string;
    success: boolean;
  };
}

const TraceAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [traceDataLoading, setTraceDataLoading] = useState(false);

  useEffect(() => {
    async function getUserIdAndConversations() {
      try {
        setIsLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        if (user) {
          setUserId(user.id);
          
          // Fetch conversations
          const { data, error: conversationsError } = await supabase
            .rpc('get_user_conversations', { user_id_param: user.id }) as any;
          
          if (conversationsError) {
            throw conversationsError;
          }
          
          if (data) {
            setConversations(data as Conversation[]);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch user data and conversations.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    getUserIdAndConversations();
  }, [toast]);
  
  const fetchConversationTrace = async (conversationId: string) => {
    try {
      setTraceDataLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_conversation_trace', { 
          conversation_id: conversationId, 
          user_id_param: userId 
        }) as any;
      
      if (error) {
        throw error;
      }
      
      setTraceData(data as TraceData);
      setSelectedConversationId(conversationId);
    } catch (error) {
      console.error('Error fetching trace data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch trace data for this conversation.',
        variant: 'destructive'
      });
    } finally {
      setTraceDataLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/multi-agent-chat">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Trace Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          Analyze your agent interactions, handoffs, and tool usage
        </p>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListFilter className="h-5 w-5 mr-2" />
                Recent Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No conversations with tracing data found.</p>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <Button
                        key={conv.conversation_id}
                        variant={selectedConversationId === conv.conversation_id ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => fetchConversationTrace(conv.conversation_id)}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">
                              {new Date(conv.start_time).toLocaleString(undefined, { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit' 
                              })}
                            </span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {conv.message_count} msgs
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            <div className="flex gap-1 flex-wrap">
                              {conv.agent_types.map((agent: string, i: number) => (
                                <span key={i} className="bg-secondary px-1.5 py-0.5 rounded-sm">
                                  {agent}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Model: {conv.model_used || "Unknown"}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-3">
          <Tabs defaultValue="dashboard">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="conversation" disabled={!selectedConversationId}>
                Conversation Analysis
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="mt-4">
              {userId && <TraceDashboard userId={userId} />}
            </TabsContent>
            
            <TabsContent value="conversation" className="mt-4">
              {traceDataLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading trace data...</span>
                </div>
              ) : selectedConversationId && traceData ? (
                <TraceViewer 
                  traceData={traceData} 
                  conversationId={selectedConversationId}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BarChart className="h-12 w-12 text-gray-500 mb-4" />
                    <h3 className="text-xl font-medium mb-2">Select a Conversation</h3>
                    <p className="text-gray-400 text-center max-w-md">
                      Choose a conversation from the list to view detailed trace information
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TraceAnalytics;
