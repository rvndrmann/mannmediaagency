
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { TraceViewer } from "./TraceViewer";

interface TraceDashboardProps {
  userId: string;
}

interface Conversation {
  conversation_id: string;
  start_time: string;
  end_time: string;
  message_count: number;
  agent_types: string[];
}

export function TraceDashboard({ userId }: TraceDashboardProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      
      try {
        // Load conversations list
        const { data: conversationsData, error: conversationsError } = await supabase
          .rpc('get_user_conversations', { user_id_param: userId });
          
        if (conversationsError) {
          console.error("Error loading conversations:", conversationsError);
        } else {
          setConversations(conversationsData || []);
        }
        
        // Load analytics summary
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_agent_trace_analytics', { user_id_param: userId });
          
        if (analyticsError) {
          console.error("Error loading analytics:", analyticsError);
        } else {
          setAnalytics(analyticsData);
        }
        
      } catch (error) {
        console.error("Error in loadData:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [userId]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading trace analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No trace data available.</div>;
  }

  // Prepare agent usage chart data
  const agentUsageData = {
    labels: Object.keys(analytics.agent_usage || {}),
    datasets: [
      {
        data: Object.values(analytics.agent_usage || {}),
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 99, 132, 0.6)"
        ]
      }
    ]
  };

  // Prepare model usage chart data
  const modelUsageData = {
    labels: Object.keys(analytics.model_usage || {}),
    datasets: [
      {
        data: Object.values(analytics.model_usage || {}),
        backgroundColor: [
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 99, 132, 0.6)"
        ]
      }
    ]
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Agent Interaction Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Total Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.total_interactions || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.total_conversations || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{((analytics.success_rate || 0) * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{((analytics.avg_duration_ms || 0) / 1000).toFixed(2)}s</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Usage</CardTitle>
            <CardDescription>Distribution of agent usage across conversations</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <BarChart data={agentUsageData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Model Usage</CardTitle>
            <CardDescription>Distribution of language models used</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <BarChart data={modelUsageData} />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Conversation History</CardTitle>
          <CardDescription>Select a conversation to view detailed metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Recent Conversations</h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Button
                      key={conv.conversation_id}
                      variant={selectedConversation === conv.conversation_id ? "default" : "outline"}
                      className="w-full justify-start text-left"
                      onClick={() => setSelectedConversation(conv.conversation_id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-500">
                          {formatDate(conv.start_time)}
                        </span>
                        <span>
                          {conv.message_count} messages with {conv.agent_types.join(", ")}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Conversation Details</h3>
              {selectedConversation ? (
                <TraceViewer 
                  userId={userId} 
                  conversationId={selectedConversation} 
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] border border-dashed rounded-md p-4">
                  <p className="text-gray-500">Select a conversation to view details</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
