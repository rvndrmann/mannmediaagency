
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsData, ConversationData, TraceData } from "@/hooks/multi-agent/types";
import { TraceViewer } from "./TraceViewer";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

interface AgentInteraction {
  id: string;
  user_id: string;
  agent_type: string;
  user_message: string;
  assistant_response: string;
  has_attachments: boolean;
  timestamp: string;
  metadata: Record<string, any>;
  created_at?: string;
  session_id?: string;
}

export const TraceDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalConversations: 0,
    completedHandoffs: 0,
    successfulToolCalls: 0,
    failedToolCalls: 0,
    modelUsage: {},
    agentUsage: {},
  });
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        
        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get conversation analytics
        const { data: interactions, error } = await supabase
          .from('agent_interactions')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        if (interactions && interactions.length > 0) {
          // Process analytics
          const agentUsage: Record<string, number> = {};
          const modelUsage: Record<string, number> = {};
          let handoffs = 0;
          let toolCalls = 0;
          let failedTools = 0;
          
          (interactions as AgentInteraction[]).forEach(interaction => {
            // Count agent usage
            const agentType = interaction.agent_type;
            if (agentType) {
              agentUsage[agentType] = (agentUsage[agentType] || 0) + 1;
            }
            
            // Count model usage
            if (interaction.metadata && typeof interaction.metadata === 'object' && 'model' in interaction.metadata) {
              const model = interaction.metadata.model as string;
              modelUsage[model] = (modelUsage[model] || 0) + 1;
            }
            
            // Count handoffs
            if (interaction.metadata && typeof interaction.metadata === 'object' && 'is_handoff' in interaction.metadata) {
              handoffs++;
            }
            
            // Count tool calls
            if (interaction.metadata && typeof interaction.metadata === 'object' && 'tool_calls' in interaction.metadata) {
              toolCalls += (interaction.metadata.tool_calls as number) || 0;
            }
            
            // Count failed tools
            if (interaction.metadata && typeof interaction.metadata === 'object' && 'failed_tools' in interaction.metadata) {
              failedTools += (interaction.metadata.failed_tools as number) || 0;
            }
          });
          
          setAnalyticsData({
            totalConversations: interactions.length,
            completedHandoffs: handoffs,
            successfulToolCalls: toolCalls - failedTools,
            failedToolCalls: failedTools,
            modelUsage,
            agentUsage,
          });
        }
        
        // Fetch recent conversations (grouped by session)
        const { data: conversationData, error: convError } = await supabase
          .from('agent_interactions')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(50);
        
        if (convError) throw convError;
        
        if (conversationData && conversationData.length > 0) {
          // Group by session ID
          const sessionMap = new Map<string, AgentInteraction[]>();
          
          (conversationData as AgentInteraction[]).forEach(interaction => {
            const sessionId = interaction.metadata && typeof interaction.metadata === 'object' && 'session_id' in interaction.metadata
              ? (interaction.metadata.session_id as string)
              : interaction.id;
              
            if (!sessionMap.has(sessionId)) {
              sessionMap.set(sessionId, []);
            }
            sessionMap.get(sessionId)?.push(interaction);
          });
          
          // Convert to conversation data format
          const conversations: ConversationData[] = Array.from(sessionMap.entries()).map(([id, interactions]) => {
            const firstInteraction = interactions[0];
            const lastInteraction = interactions[interactions.length - 1];
            
            const agentTypes = Array.from(new Set(
              interactions.map(i => i.agent_type || 'unknown')
            ));
            
            return {
              id,
              startTime: firstInteraction.timestamp,
              endTime: lastInteraction.timestamp,
              duration: new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime(),
              agentTypes,
              messageCount: interactions.length,
              toolCalls: interactions.reduce((sum, i) => {
                if (i.metadata && typeof i.metadata === 'object' && 'tool_calls' in i.metadata) {
                  return sum + ((i.metadata.tool_calls as number) || 0);
                }
                return sum;
              }, 0),
              handoffs: interactions.reduce((sum, i) => {
                if (i.metadata && typeof i.metadata === 'object' && 'is_handoff' in i.metadata) {
                  return sum + 1;
                }
                return sum;
              }, 0),
              status: 'completed',
              userId: user.id,
              firstMessage: firstInteraction.user_message,
            };
          });
          
          setConversations(conversations);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);
  
  // Fetch trace data when a trace is selected
  useEffect(() => {
    const fetchTraceData = async () => {
      if (!selectedTraceId) return;
      
      try {
        setIsLoading(true);
        
        // Get conversation interactions
        const { data, error } = await supabase
          .from('agent_interactions')
          .select('*')
          .eq('session_id', selectedTraceId)
          .order('timestamp', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Extract events from interactions
          const events = (data as AgentInteraction[]).flatMap(interaction => {
            const baseEvent = {
              id: interaction.id,
              timestamp: new Date(interaction.timestamp).getTime(),
              agentType: interaction.agent_type || 'unknown',
            };
            
            const events = [];
            
            // User message event
            if (interaction.user_message) {
              events.push({
                ...baseEvent,
                eventType: 'user_message',
                data: { content: interaction.user_message }
              });
            }
            
            // Assistant response event
            if (interaction.assistant_response) {
              events.push({
                ...baseEvent,
                eventType: 'assistant_response',
                data: { content: interaction.assistant_response }
              });
            }
            
            // Tool events
            if (interaction.metadata && typeof interaction.metadata === 'object' && 
                'tool_calls' in interaction.metadata && (interaction.metadata.tool_calls as number) > 0) {
              events.push({
                ...baseEvent,
                eventType: 'tool_call',
                data: { 
                  tool: interaction.metadata.tool_name as string, 
                  success: !(interaction.metadata.failed_tools as boolean)
                }
              });
            }
            
            // Handoff events
            if (interaction.metadata && typeof interaction.metadata === 'object' && 'is_handoff' in interaction.metadata) {
              events.push({
                ...baseEvent,
                eventType: 'handoff',
                data: { 
                  from: interaction.metadata.from_agent as string,
                  to: interaction.metadata.to_agent as string
                }
              });
            }
            
            return events;
          });
          
          // Get first interaction for summary
          const firstInteraction = data[0] as AgentInteraction;
          const lastInteraction = data[data.length - 1] as AgentInteraction;
          
          const trace: TraceData = {
            id: selectedTraceId,
            events,
            summary: {
              startTime: new Date(firstInteraction.timestamp).getTime(),
              endTime: new Date(lastInteraction.timestamp).getTime(),
              duration: new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime(),
              agentTypes: Array.from(new Set((data as AgentInteraction[]).map(i => i.agent_type || 'unknown'))),
              userId: firstInteraction.user_id,
              success: true,
              toolCalls: (data as AgentInteraction[]).reduce((sum, i) => {
                if (i.metadata && typeof i.metadata === 'object' && 'tool_calls' in i.metadata) {
                  return sum + ((i.metadata.tool_calls as number) || 0);
                }
                return sum;
              }, 0),
              handoffs: (data as AgentInteraction[]).reduce((sum, i) => {
                if (i.metadata && typeof i.metadata === 'object' && 'is_handoff' in i.metadata) {
                  return sum + 1;
                }
                return sum;
              }, 0),
              messageCount: data.length,
              modelUsed: firstInteraction.metadata && typeof firstInteraction.metadata === 'object' && 
                'model' in firstInteraction.metadata ? (firstInteraction.metadata.model as string) : 'unknown'
            }
          };
          
          setTraceData(trace);
        }
      } catch (error) {
        console.error("Error fetching trace data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTraceData();
  }, [selectedTraceId]);

  // Format data for charts
  const getAgentChartData = () => {
    return Object.entries(analyticsData.agentUsage).map(([name, value]) => ({
      name,
      value
    }));
  };

  const getModelChartData = () => {
    return Object.entries(analyticsData.modelUsage).map(([name, value]) => ({
      name,
      value
    }));
  };

  const handleViewTrace = (traceId: string) => {
    setSelectedTraceId(traceId);
    setActiveTab("trace");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Conversation Analytics</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          {selectedTraceId && <TabsTrigger value="trace">Trace Viewer</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Total Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analyticsData.totalConversations}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Agent Handoffs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analyticsData.completedHandoffs}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Successful Tool Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-500">{analyticsData.successfulToolCalls}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Failed Tool Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">{analyticsData.failedToolCalls}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Usage</CardTitle>
                <CardDescription>Distribution of agent types used in conversations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getAgentChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {getAgentChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Model Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Model Usage</CardTitle>
                <CardDescription>Distribution of AI models used</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getModelChartData()}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>List of your recent AI conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Agents Used</th>
                      <th className="px-4 py-2 text-left">Messages</th>
                      <th className="px-4 py-2 text-left">First Message</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((conversation) => (
                      <tr key={conversation.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{new Date(conversation.startTime).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          {conversation.agentTypes.map((agent) => (
                            <span 
                              key={agent}
                              className="inline-block px-2 py-1 mr-1 text-xs rounded-full bg-blue-100 text-blue-800"
                            >
                              {agent}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-2">{conversation.messageCount}</td>
                        <td className="px-4 py-2 truncate max-w-xs">{conversation.firstMessage || 'N/A'}</td>
                        <td className="px-4 py-2">
                          <button 
                            onClick={() => handleViewTrace(conversation.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            View Trace
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trace">
          {traceData && <TraceViewer trace={traceData} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};
