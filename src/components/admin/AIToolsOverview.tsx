
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from "recharts";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Define interfaces for our data
interface ToolUsageData {
  tool: string;
  count: number;
  percentage?: number;
}

interface ChatSession {
  id: string;
  created_at: string;
  user_id: string;
  message_content: string;
  selected_tool?: string;
  tool_parameters?: Record<string, any>;
  tool_selection_confidence?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AIToolsOverview() {
  const [activeTab, setActiveTab] = useState("usage");
  const [toolUsage, setToolUsage] = useState<ToolUsageData[]>([]);
  const [recentChatSessions, setRecentChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToolUsageData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch chat usage data from the database
      const { data: chatData, error: chatError } = await supabase
        .from('chat_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (chatError) throw chatError;
      
      // Process chat data to extract tool usage
      const toolCounts: Record<string, number> = {
        'product-shot-v1': 0,
        'product-shot-v2': 0,
        'image-to-video': 0,
        'no-tool': 0
      };
      
      // Count tool occurrences in recent chat sessions
      chatData.forEach(session => {
        // Check for tool usage in the command field or message content
        let toolUsed = 'no-tool';
        
        if (session.selected_tool) {
          toolUsed = session.selected_tool;
        } else if (session.message_content) {
          const content = session.message_content.toLowerCase();
          if (content.includes('product shot v1') || content.includes('product-shot-v1')) {
            toolUsed = 'product-shot-v1';
          } else if (content.includes('product shot v2') || content.includes('product-shot-v2')) {
            toolUsed = 'product-shot-v2';
          } else if (content.includes('image to video') || content.includes('image-to-video')) {
            toolUsed = 'image-to-video';
          }
        }
        
        // Increment the count for this tool
        toolCounts[toolUsed] = (toolCounts[toolUsed] || 0) + 1;
      });
      
      // Convert to the format needed for charts
      const totalCount = Object.values(toolCounts).reduce((sum, count) => sum + count, 0);
      const toolUsageData = Object.entries(toolCounts).map(([tool, count]) => ({
        tool,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      }));
      
      setToolUsage(toolUsageData);
      setRecentChatSessions(chatData);
      setError(null);
    } catch (err) {
      console.error("Error fetching tool usage data:", err);
      setError("Failed to load tool usage data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToolUsageData();
  }, []);

  // Formatter for the pie chart labels
  const renderCustomizedLabel = ({ name, value, percent }: any) => {
    return `${name}: ${percent}%`;
  };

  // Format timestamps
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">AI Tools Overview</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="usage">Tool Usage</TabsTrigger>
          <TabsTrigger value="sessions">Recent Chat Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-10">Loading usage data...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="text-lg font-medium mb-4">Tool Usage Distribution</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={toolUsage}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="tool"
                          label={renderCustomizedLabel}
                        >
                          {toolUsage.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-lg font-medium mb-4">Tool Usage Counts</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={toolUsage}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="tool" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card>
                <Table>
                  <TableCaption>Summary of AI tool usage</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead>Usage Count</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toolUsage.map((item) => (
                      <TableRow key={item.tool}>
                        <TableCell className="font-medium">{item.tool}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>{item.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <Table>
              <TableCaption>Recent AI chat sessions</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User Message</TableHead>
                  <TableHead>Tool Used</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentChatSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatTimestamp(session.created_at)}</TableCell>
                    <TableCell className="max-w-md truncate">{session.message_content}</TableCell>
                    <TableCell>
                      {session.selected_tool ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                          {session.selected_tool}
                        </Badge>
                      ) : (
                        <Badge variant="outline">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.tool_selection_confidence 
                        ? `${Math.round(session.tool_selection_confidence * 100)}%` 
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
