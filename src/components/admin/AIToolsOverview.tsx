
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

interface ImageGenerationJob {
  id: string;
  request_id: string;
  status: string;
  created_at: string;
  prompt: string;
  user_id: string;
  result_url?: string;
  error_message?: string;
}

export const AIToolsOverview = () => {
  const [toolUsageData, setToolUsageData] = useState<{ [key: string]: number }>({});
  const [chatUsage, setChatUsage] = useState<ChatUsage[]>([]);
  const [pendingImageJobs, setPendingImageJobs] = useState<ImageGenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

      // Fetch pending image generation jobs
      await fetchPendingImageJobs();
    } catch (error) {
      console.error('Error fetching AI tool usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingImageJobs = async () => {
    try {
      const { data: imageJobs, error: imageError } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .in('status', ['pending']) // Fetching only 'pending' jobs since that maps to both IN_QUEUE and PROCESSING
        .order('created_at', { ascending: false });

      if (imageError) throw imageError;
      setPendingImageJobs(imageJobs as ImageGenerationJob[]);
    } catch (error) {
      console.error('Error fetching pending image jobs:', error);
      toast.error("Failed to fetch pending image jobs");
    }
  };

  useEffect(() => {
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

  const handleRetryAll = async () => {
    if (pendingImageJobs.length === 0) {
      toast.info("No pending image jobs to retry");
      return;
    }

    setIsRetrying(true);
    
    try {
      toast.info(`Starting retry for ${pendingImageJobs.length} image jobs...`);
      
      // Extract all job IDs
      const jobIds = pendingImageJobs.map(job => job.id);

      // Call the retry-image-generation edge function
      const response = await supabase.functions.invoke('retry-image-generation', {
        body: { jobIds }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      console.log("Retry response:", data);

      if (data.success) {
        const successCount = data.results.filter((r: any) => r.success).length;
        const failCount = data.results.length - successCount;
        
        // Refresh the job list to show updated statuses
        await fetchPendingImageJobs();
        
        if (successCount > 0) {
          toast.success(`Successfully processed ${successCount} jobs, ${failCount} failed`);
        } else {
          toast.warning(`Processed ${data.results.length} jobs, but none were completed. They may still be processing.`);
        }
      } else {
        throw new Error(data.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error('Error in retry operation:', error);
      toast.error(error.message || 'Error retrying image jobs');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDeleteFailedJobs = async () => {
    const failedJobs = pendingImageJobs.filter(job => job.error_message?.includes('400'));
    
    if (failedJobs.length === 0) {
      toast.info("No jobs with 400 status found to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${failedJobs.length} failed jobs?`)) {
      return;
    }

    setIsDeleting(true);
    
    try {
      toast.info(`Deleting ${failedJobs.length} failed jobs...`);
      
      // Extract job IDs that have 400 errors
      const jobIds = failedJobs.map(job => job.id);

      // Delete the jobs from the database
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .delete()
        .in('id', jobIds);

      if (error) throw error;
      
      // Refresh the job list
      await fetchPendingImageJobs();
      toast.success(`Successfully deleted ${jobIds.length} failed jobs`);
    } catch (error) {
      console.error('Error deleting failed jobs:', error);
      toast.error('Error deleting failed jobs');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">AI Tools Overview</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage-log">Usage Log</TabsTrigger>
          <TabsTrigger value="image-jobs">Image Jobs</TabsTrigger>
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

        <TabsContent value="image-jobs">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Pending Image Generation Jobs</CardTitle>
                <CardDescription>
                  Manage pending and processing image generation jobs
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={fetchPendingImageJobs}
                  disabled={isRetrying || isDeleting}
                >
                  Refresh List
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRetryAll} 
                  disabled={isRetrying || isDeleting || pendingImageJobs.length === 0}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry All Jobs'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDeleteFailedJobs}
                  disabled={isRetrying || isDeleting}
                  className="flex items-center gap-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Failed Jobs (400)
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading data...</p>
              ) : pendingImageJobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingImageJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs">{job.request_id || 'N/A'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.error_message?.includes('400')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {job.status === 'pending' ? 'IN_QUEUE' : job.status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{job.prompt}</TableCell>
                        <TableCell className="font-mono text-xs">{job.user_id}</TableCell>
                        <TableCell className="max-w-xs truncate text-red-500">
                          {job.error_message || 'None'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-4 text-center">
                  <p>No pending image generation jobs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
