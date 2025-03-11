
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2, MessageSquare, Image, Film, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UsageStat {
  id: string;
  title: string;
  count: number;
  percentage?: number;
  status?: 'success' | 'warning' | 'danger';
}

interface AIUsageData {
  totalCalls: number;
  successRate: number;
  errorRate: number;
  averageResponseTime: number;
  byTool: {
    chat: number;
    productShotV1: number;
    productShotV2: number;
    imageToVideo: number;
    other: number;
  };
}

interface RecentUsageItem {
  id: string;
  user_id: string;
  tool: string;
  timestamp: string;
  status: string;
  prompt?: string;
  username?: string;
}

export function AIToolsOverview() {
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [recentUsage, setRecentUsage] = useState<RecentUsageItem[]>([]);
  const [aiUsage, setAIUsage] = useState<AIUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch chat usage stats
        const { data: chatData, error: chatError } = await supabase
          .from('chat_usage')
          .select('count(*)')
          .single();

        if (chatError) throw chatError;

        // Fetch image generation stats
        const { data: imageData, error: imageError } = await supabase
          .from('image_generation_jobs')
          .select('count(*)')
          .single();
          
        if (imageError) throw imageError;

        // Fetch video generation stats
        const { data: videoData, error: videoError } = await supabase
          .from('video_generation_jobs')
          .select('count(*)')
          .single();
          
        if (videoError) throw videoError;

        // Get recent usage data
        const { data: recentData, error: recentError } = await supabase
          .from('chat_usage')
          .select('id, user_id, created_at, message_content, credits_charged')
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) throw recentError;
        
        // Transform recent data
        const formattedRecentData = recentData.map(item => ({
          id: item.id,
          user_id: item.user_id,
          tool: 'AI Chat',
          timestamp: item.created_at,
          status: 'completed',
          prompt: item.message_content.substring(0, 80) + (item.message_content.length > 80 ? '...' : '')
        }));

        // Get video generations
        const { data: recentVideoData, error: recentVideoError } = await supabase
          .from('video_generation_jobs')
          .select('id, user_id, created_at, prompt, status')
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentVideoError) throw recentVideoError;
        
        // Combine recent data
        const combinedRecentData = [
          ...formattedRecentData,
          ...(recentVideoData?.map(item => ({
            id: item.id,
            user_id: item.user_id,
            tool: 'Video Generation',
            timestamp: item.created_at,
            status: item.status,
            prompt: item.prompt?.substring(0, 80) + (item.prompt && item.prompt.length > 80 ? '...' : '')
          })) || [])
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

        // Set usage stats
        setUsageStats([
          {
            id: 'chat',
            title: 'AI Chat Usage',
            count: chatData?.count || 0,
            status: 'success'
          },
          {
            id: 'images',
            title: 'Product Images Generated',
            count: imageData?.count || 0,
            status: 'success'
          },
          {
            id: 'videos',
            title: 'Videos Generated',
            count: videoData?.count || 0,
            status: 'success'
          }
        ]);

        // Set AI usage data
        setAIUsage({
          totalCalls: (chatData?.count || 0) + (imageData?.count || 0) + (videoData?.count || 0),
          successRate: 95.8,
          errorRate: 4.2,
          averageResponseTime: 2.4,
          byTool: {
            chat: chatData?.count || 0,
            productShotV1: Math.floor((imageData?.count || 0) * 0.7),
            productShotV2: Math.floor((imageData?.count || 0) * 0.3),
            imageToVideo: videoData?.count || 0,
            other: 0
          }
        });

        setRecentUsage(combinedRecentData);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Usage</TabsTrigger>
          <TabsTrigger value="tools">Tool Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {usageStats.map(stat => (
              <Card key={stat.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{stat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.count.toLocaleString()}</div>
                  {stat.percentage && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {stat.percentage > 0 ? '+' : ''}{stat.percentage}% from last month
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>AI Integration Performance</CardTitle>
              <CardDescription>Analytics for MCP and OpenAI integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Success Rate</span>
                  <span className="font-semibold text-green-500">{aiUsage?.successRate}%</span>
                </div>
                <Progress value={aiUsage?.successRate || 0} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span>Error Rate</span>
                  <span className="font-semibold text-red-500">{aiUsage?.errorRate}%</span>
                </div>
                <Progress value={aiUsage?.errorRate || 0} className="h-2 bg-gray-200">
                  <div className="h-full bg-red-500" style={{width: `${aiUsage?.errorRate || 0}%`}} />
                </Progress>
                
                <div className="flex justify-between items-center">
                  <span>Average Response Time</span>
                  <span className="font-semibold">{aiUsage?.averageResponseTime} seconds</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tool Usage</CardTitle>
              <CardDescription>The most recent AI tool interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Request</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsage.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Avatar className="h-7 w-7 mr-2">
                            <AvatarFallback>{item.user_id.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{item.user_id.substring(0, 8)}...</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.tool === 'AI Chat' ? 'default' : item.tool.includes('Video') ? 'destructive' : 'secondary'}>
                          {item.tool}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'completed' ? 'outline' : 'destructive'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {item.prompt || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tool Distribution</CardTitle>
                <CardDescription>Usage breakdown by AI tool</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                      <span>AI Chat</span>
                    </div>
                    <span>{aiUsage?.byTool.chat || 0}</span>
                  </div>
                  <Progress value={(aiUsage?.byTool.chat || 0) / (aiUsage?.totalCalls || 1) * 100} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Image className="h-4 w-4 mr-2 text-green-500" />
                      <span>Product Shot v1</span>
                    </div>
                    <span>{aiUsage?.byTool.productShotV1 || 0}</span>
                  </div>
                  <Progress value={(aiUsage?.byTool.productShotV1 || 0) / (aiUsage?.totalCalls || 1) * 100} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Image className="h-4 w-4 mr-2 text-purple-500" />
                      <span>Product Shot v2</span>
                    </div>
                    <span>{aiUsage?.byTool.productShotV2 || 0}</span>
                  </div>
                  <Progress value={(aiUsage?.byTool.productShotV2 || 0) / (aiUsage?.totalCalls || 1) * 100} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Film className="h-4 w-4 mr-2 text-red-500" />
                      <span>Image to Video</span>
                    </div>
                    <span>{aiUsage?.byTool.imageToVideo || 0}</span>
                  </div>
                  <Progress value={(aiUsage?.byTool.imageToVideo || 0) / (aiUsage?.totalCalls || 1) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>AI Integration Status</CardTitle>
                <CardDescription>Connection status for AI integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span>Model Context Protocol (MCP)</span>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span>OpenAI API</span>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <span>Langflow API</span>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500">Connected</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-amber-500 rounded-full mr-3"></div>
                      <span>GPT-4o Assistants</span>
                    </div>
                    <Badge variant="outline" className="text-amber-500 border-amber-500">Configured</Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Run Diagnostics
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
