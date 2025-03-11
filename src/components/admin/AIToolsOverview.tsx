
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";

// Extended type to include the selected_tool field
interface ChatUsage {
  id: string;
  user_id: string;
  created_at: string;
  message_content: string;
  credits_charged: number;
  words_count: number;
  selected_tool?: string; // Make it optional as it might not be present in all records
}

export const AIToolsOverview = () => {
  const [toolUsageData, setToolUsageData] = useState<{ [key: string]: number }>({});
  const [chatUsage, setChatUsage] = useState<ChatUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('chat_usage')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        
        setChatUsage(data as ChatUsage[]);
        
        // Calculate tool usage
        const toolCounts: { [key: string]: number } = {};
        data.forEach((chat: ChatUsage) => {
          if (chat.selected_tool) {
            const tool = chat.selected_tool;
            toolCounts[tool] = (toolCounts[tool] || 0) + 1;
          }
        });
        
        setToolUsageData(toolCounts);
      } catch (error) {
        console.error('Error fetching AI tool usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = {
    labels: Object.keys(toolUsageData),
    datasets: [
      {
        label: 'Tool Usage Count',
        data: Object.values(toolUsageData),
        backgroundColor: [
          'rgba(53, 162, 235, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
      },
    ],
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">AI Tools Overview</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage-log">Usage Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Tool Usage Distribution</CardTitle>
              <CardDescription>
                Number of times each AI tool has been used
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <p>Loading data...</p>
                </div>
              ) : Object.keys(toolUsageData).length > 0 ? (
                <div className="h-80">
                  <BarChart data={chartData} />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <p>No tool usage data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage-log">
          <Card>
            <CardHeader>
              <CardTitle>AI Chat Usage Log</CardTitle>
              <CardDescription>
                Recent AI chat interactions and tool usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading data...</p>
              ) : chatUsage.length > 0 ? (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool Used</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chatUsage.map((chat) => (
                        <tr key={chat.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(chat.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {chat.message_content}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {chat.selected_tool || 'None'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {chat.credits_charged.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No chat usage data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
