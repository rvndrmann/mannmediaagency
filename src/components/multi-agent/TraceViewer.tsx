
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentType } from "@/hooks/use-multi-agent-chat";

interface TraceViewerProps {
  userId: string;
  conversationId?: string;
}

interface TraceMetrics {
  agentUsage: Record<string, number>;
  toolUsage: Record<string, number>;
  modelUsage: Record<string, number>;
  handoffs: number;
  averageTurnCount: number;
  successRate: number;
}

export function TraceViewer({ userId, conversationId }: TraceViewerProps) {
  const [metrics, setMetrics] = useState<TraceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTraceData = async () => {
      try {
        setIsLoading(true);
        
        let query = supabase
          .from("agent_interactions")
          .select("*")
          .eq("user_id", userId);
          
        if (conversationId) {
          query = query.filter("metadata->trace->runId", "eq", conversationId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error loading trace data:", error);
          return;
        }
        
        if (!data || data.length === 0) {
          setIsLoading(false);
          return;
        }
        
        // Process the data to calculate metrics
        const agentUsage: Record<string, number> = {};
        const toolUsage: Record<string, number> = {};
        const modelUsage: Record<string, number> = {};
        let totalHandoffs = 0;
        let totalTurns = 0;
        let successCount = 0;
        
        data.forEach(interaction => {
          // Count agent usage
          const agentType = interaction.agent_type;
          agentUsage[agentType] = (agentUsage[agentType] || 0) + 1;
          
          // Extract trace data if available
          const traceData = interaction.metadata?.trace;
          if (traceData) {
            // Count tool usage from the trace
            if (traceData.summary?.toolCalls) {
              toolUsage["Total"] = (toolUsage["Total"] || 0) + traceData.summary.toolCalls;
            }
            
            // Count handoffs
            if (traceData.summary?.handoffs) {
              totalHandoffs += traceData.summary.handoffs;
            }
            
            // Count model usage
            if (traceData.summary?.modelUsed) {
              const model = traceData.summary.modelUsed;
              modelUsage[model] = (modelUsage[model] || 0) + 1;
            }
            
            // Count turns
            if (traceData.summary?.totalMessages) {
              totalTurns += traceData.summary.totalMessages;
            }
            
            // Count successes
            if (traceData.summary?.success) {
              successCount++;
            }
          }
        });
        
        setMetrics({
          agentUsage,
          toolUsage,
          modelUsage,
          handoffs: totalHandoffs,
          averageTurnCount: data.length > 0 ? totalTurns / data.length : 0,
          successRate: data.length > 0 ? (successCount / data.length) * 100 : 0
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error in loadTraceData:", error);
        setIsLoading(false);
      }
    };
    
    if (userId) {
      loadTraceData();
    }
  }, [userId, conversationId]);

  if (isLoading) {
    return <div className="text-center py-8">Loading trace data...</div>;
  }

  if (!metrics) {
    return <div className="text-center py-8">No trace data available.</div>;
  }

  // Prepare chart data
  const agentChartData = {
    labels: Object.keys(metrics.agentUsage),
    datasets: [
      {
        data: Object.values(metrics.agentUsage),
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

  const modelChartData = {
    labels: Object.keys(metrics.modelUsage),
    datasets: [
      {
        data: Object.values(metrics.modelUsage),
        backgroundColor: [
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 99, 132, 0.6)"
        ]
      }
    ]
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Agent Interaction Metrics</CardTitle>
        <CardDescription>
          Analysis of agent interactions and performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="metrics">
          <TabsList className="mb-4">
            <TabsTrigger value="metrics">Summary Metrics</TabsTrigger>
            <TabsTrigger value="agents">Agent Usage</TabsTrigger>
            <TabsTrigger value="models">Model Usage</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Handoffs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.handoffs}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Avg. Turn Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.averageTurnCount.toFixed(1)}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="agents">
            <div className="h-64">
              <BarChart data={agentChartData} />
            </div>
          </TabsContent>
          
          <TabsContent value="models">
            <div className="h-64">
              <BarChart data={modelChartData} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
