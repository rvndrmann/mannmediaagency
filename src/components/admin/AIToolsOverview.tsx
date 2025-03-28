
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, RepeatIcon } from "lucide-react";
import { toast } from "sonner";

export function AIToolsOverview() {
  const [stuckJobs, setStuckJobs] = useState<any[]>([]);
  const [isLoadingStuckJobs, setIsLoadingStuckJobs] = useState(false);
  const [isRetrying, setIsRetrying] = useState<{ [key: string]: boolean }>({});
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<{ [key: string]: boolean }>({});

  // Fetch all stuck jobs (in_queue and failed)
  const fetchStuckJobs = async () => {
    try {
      setIsLoadingStuckJobs(true);
      
      // Fetch image generation jobs that are still in_queue or failed
      const { data: imageJobs, error: imageError } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .in('status', ['in_queue', 'failed']) // Use the database's actual enum values
        .order('created_at', { ascending: false });

      if (imageError) throw imageError;
      
      // Format the timestamp
      const formattedJobs = imageJobs?.map(job => ({
        ...job,
        created_at_formatted: new Date(job.created_at).toLocaleString(),
        // Map DB status to UI status (standardized to IN_QUEUE, COMPLETED, FAILED)
        status_ui: job.status === 'in_queue' ? 'IN_QUEUE' : 
                  job.status === 'completed' ? 'COMPLETED' : 
                  job.status === 'failed' ? 'FAILED' : 'IN_QUEUE'
      })) || [];
      
      setStuckJobs(formattedJobs);
    } catch (error) {
      console.error('Error fetching stuck jobs:', error);
      toast.error("Failed to fetch stuck jobs");
    } finally {
      setIsLoadingStuckJobs(false);
    }
  };

  const retryAllJobs = async () => {
    setIsRetryingAll(true);
    try {
      const retryPromises = stuckJobs.map(job => retryFailedJob(job.id));
      await Promise.all(retryPromises);
      // After retrying all, refresh the list
      await fetchStuckJobs();
      toast.success("All jobs have been resubmitted for processing");
    } catch (error) {
      console.error("Error retrying all jobs:", error);
      toast.error("Failed to retry all jobs");
    } finally {
      setIsRetryingAll(false);
    }
  };

  const retryFailedJob = async (jobId: string) => {
    if (!jobId) {
      console.error("Cannot retry job: No job ID provided");
      toast.error("Cannot retry job: Missing job ID");
      return false;
    }
    
    setIsRetrying(prevState => ({ ...prevState, [jobId]: true }));
    try {
      console.log(`Retrying job with ID: ${jobId}`);
      
      const { data, error } = await supabase.functions.invoke('retry-image-generation', {
        body: { jobId }
      });

      if (error) {
        console.error(`Error retrying job ${jobId}:`, error);
        toast.error(`Failed to retry job: ${error.message}`);
        return false;
      } else {
        console.log(`Job ${jobId} retry response:`, data);
        
        if (!data.success) {
          throw new Error(data.error || "Unknown error occurred during retry");
        }
        
        toast.success(`Job resubmitted for processing`);
        return true;
      }
    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
      toast.error(`Failed to retry job: ${error instanceof Error ? error.message : "Unknown error"}`);
      return false;
    } finally {
      setIsRetrying(prevState => ({ ...prevState, [jobId]: false }));
      fetchStuckJobs(); // Refresh the list after retrying
    }
  };

  const checkJobStatus = async (jobId: string) => {
    if (!jobId) {
      console.error("Cannot check status: No job ID provided");
      toast.error("Cannot check status: Missing job ID");
      return;
    }
    
    setIsCheckingStatus(prevState => ({ ...prevState, [jobId]: true }));
    try {
      console.log(`Checking status for job ID: ${jobId}`);
      
      const { data, error } = await supabase.functions.invoke('check-image-status', {
        body: { jobId }
      });

      if (error) {
        console.error(`Error checking status for job ${jobId}:`, error);
        toast.error(`Failed to check job status: ${error.message}`);
      } else {
        console.log(`Status check for job ${jobId}:`, data);
        toast.success(`Job status updated`);
      }
    } catch (error) {
      console.error(`Error checking status for job ${jobId}:`, error);
      toast.error(`Failed to check job status: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCheckingStatus(prevState => ({ ...prevState, [jobId]: false }));
      fetchStuckJobs(); // Refresh the list after checking status
    }
  };

  useEffect(() => {
    fetchStuckJobs();
  }, []);

  return (
    <div className="space-y-8">
      {/* API Key Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Key Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            This section will display the status of the API keys required for AI
            tools.
          </p>
        </CardContent>
      </Card>

      {/* Job Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Job Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            This section will provide an overview of the status of all AI jobs.
          </p>
        </CardContent>
      </Card>

      {/* Stuck Jobs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Stuck Jobs</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchStuckJobs}
                disabled={isLoadingStuckJobs}
              >
                {isLoadingStuckJobs ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" /> 
                    Refresh
                  </>
                )}
              </Button>
              <Button 
                variant="default"
                size="sm"
                onClick={retryAllJobs}
                disabled={isRetryingAll || stuckJobs.length === 0}
              >
                {isRetryingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Retrying All...
                  </>
                ) : (
                  <>
                    <RepeatIcon className="mr-2 h-4 w-4" /> 
                    Retry All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stuckJobs.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No stuck jobs found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Job ID</TableHead>
                    <TableHead className="w-[150px]">Request ID</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead className="w-[160px]">Created</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stuckJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">{job.id.substring(0, 8)}...</TableCell>
                      <TableCell className="font-mono text-xs">{job.request_id || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.error_message?.includes('400')
                            ? 'bg-red-100 text-red-800'
                            : job.status === 'in_queue'
                              ? 'bg-yellow-100 text-yellow-800'
                              : job.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}>
                          {job.status_ui || job.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{job.prompt}</TableCell>
                      <TableCell>{job.created_at_formatted}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => checkJobStatus(job.id)}
                            disabled={isCheckingStatus[job.id]}
                          >
                            {isCheckingStatus[job.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryFailedJob(job.id)}
                            disabled={isRetrying[job.id]}
                          >
                            {isRetrying[job.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RepeatIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Model Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Model Usage Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            This section will display the usage statistics for each AI model.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
