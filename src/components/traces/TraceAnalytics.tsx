
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TraceDashboard } from './TraceDashboard';
import { TraceViewer } from '../multi-agent/TraceViewer';
import { supabase } from '@/integrations/supabase/client';
import { TracingService } from '@/services/tracing/TracingService';
import { AgentAnalytics, ConversationSummary, ConversationTraceData } from '@/services/tracing/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function TraceAnalytics() {
  const [userId, setUserId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<ConversationTraceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Get the current user
  useEffect(() => {
    const getUserId = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    
    getUserId();
  }, []);
  
  // Load analytics data when userId changes
  useEffect(() => {
    if (!userId) return;
    
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load analytics
        const analyticsData = await TracingService.getUserAnalytics(userId);
        setAnalytics(analyticsData);
        
        // Load conversation list
        const conversationsData = await TracingService.getUserConversations(userId);
        setConversations(conversationsData);
      } catch (error) {
        console.error('Error loading trace data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [userId]);
  
  // Load conversation details when a conversation is selected
  useEffect(() => {
    if (!userId || !selectedConversation) {
      setConversationData(null);
      return;
    }
    
    const loadConversation = async () => {
      try {
        const data = await TracingService.getConversationTrace(selectedConversation, userId);
        setConversationData(data);
      } catch (error) {
        console.error('Error loading conversation data:', error);
      }
    };
    
    loadConversation();
  }, [userId, selectedConversation]);
  
  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Please log in to view trace analytics</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Agent Trace Analytics</h1>
      
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <TraceDashboard userId={userId} />
          )}
        </TabsContent>
        
        <TabsContent value="conversations" className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conversations && conversations.length > 0 ? (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {conversations.map((conversation) => (
                          <div 
                            key={conversation.conversation_id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedConversation === conversation.conversation_id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedConversation(conversation.conversation_id)}
                          >
                            <div className="font-medium">
                              {new Date(conversation.start_time).toLocaleString()}
                            </div>
                            <div className="text-sm flex justify-between">
                              <span>
                                {conversation.agent_types.join(', ')}
                              </span>
                              <span>
                                {conversation.message_count} messages
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        No conversations found
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:col-span-3">
                {selectedConversation && conversationData ? (
                  <TraceViewer 
                    traceData={conversationData}
                    conversationId={selectedConversation}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Select a conversation to view details
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
