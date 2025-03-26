
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FilmIcon, ClipboardIcon, XCircleIcon, CheckCircleIcon, Clock } from 'lucide-react';

interface BrowserTaskHistoryProps {
  onLoadTask: (taskId: string) => void;
}

export const BrowserTaskHistory: React.FC<BrowserTaskHistoryProps> = ({ onLoadTask }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Function to fetch tasks from Supabase
  const fetchTasks = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to view your task history');
      }

      const { data, error } = await supabase
        .from('browser_automation_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load task history');
    } finally {
      setLoading(false);
    }
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'finished':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircleIcon size={12} /> Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Running</Badge>;
      case 'paused':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock size={12} /> Paused</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircleIcon size={12} /> Failed</Badge>;
      case 'stopped':
        return <Badge variant="secondary" className="flex items-center gap-1"><XCircleIcon size={12} /> Stopped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format the task output for display
  const formatTaskOutput = (task: any) => {
    if (!task.output) return 'No output available';
    
    try {
      // If output is a string, try to parse it as JSON
      const parsedOutput = typeof task.output === 'string' ? JSON.parse(task.output) : task.output;
      
      // Check if it's an array or object and stringify it for display
      if (Array.isArray(parsedOutput) || typeof parsedOutput === 'object') {
        return JSON.stringify(parsedOutput, null, 2);
      }
      
      return task.output;
    } catch (e) {
      // If parsing fails, return the original string
      return task.output;
    }
  };

  // Check if a task has recordings
  const hasRecordings = (task: any) => {
    if (task.browser_data?.recordings?.length > 0) {
      return true;
    }
    
    // Also check the local storage for cached recordings
    const localMedia = localStorage.getItem(`workerAI_media_${task.browser_task_id}`);
    if (localMedia) {
      try {
        const mediaData = JSON.parse(localMedia);
        return mediaData?.recordings?.length > 0;
      } catch (e) {
        return false;
      }
    }
    
    return false;
  };

  // Get the recording URL for a task
  const getRecordingUrl = (task: any) => {
    if (task.browser_data?.recordings?.length > 0) {
      return task.browser_data.recordings[0];
    }
    
    const localMedia = localStorage.getItem(`workerAI_media_${task.browser_task_id}`);
    if (localMedia) {
      try {
        const mediaData = JSON.parse(localMedia);
        return mediaData?.recordings?.[0];
      } catch (e) {
        return null;
      }
    }
    
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Task History</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No task history found.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <h3 className="text-lg font-medium line-clamp-2 flex-1">{task.input}</h3>
                          {getStatusBadge(task.status)}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {task.created_at && formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                        {task.browser_task_id && hasRecordings(task) && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={getRecordingUrl(task)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              <FilmIcon size={14} />
                              View Recording
                            </a>
                          </Button>
                        )}
                        <Button variant="default" size="sm" onClick={() => onLoadTask(task.id)}>
                          Load Task
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleTaskExpansion(task.id)}
                        >
                          {expandedTask === task.id ? 'Hide Details' : 'Show Details'}
                        </Button>
                      </div>
                    </div>
                    
                    {expandedTask === task.id && (
                      <div className="mt-4 border-t pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Task Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Status:</span> {task.status}</p>
                              <p><span className="font-medium">Created:</span> {new Date(task.created_at).toLocaleString()}</p>
                              {task.completed_at && (
                                <p><span className="font-medium">Completed:</span> {new Date(task.completed_at).toLocaleString()}</p>
                              )}
                              {task.current_url && (
                                <p><span className="font-medium">Last URL:</span> {task.current_url}</p>
                              )}
                              {task.browser_task_id && (
                                <p className="flex items-center gap-1">
                                  <span className="font-medium">Task ID:</span> 
                                  <span className="text-xs text-gray-500">{task.browser_task_id}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6" 
                                    onClick={() => {
                                      navigator.clipboard.writeText(task.browser_task_id);
                                      toast.success('Task ID copied to clipboard');
                                    }}
                                  >
                                    <ClipboardIcon size={12} />
                                  </Button>
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Task Steps</h4>
                            {task.browser_data?.steps?.length > 0 ? (
                              <ScrollArea className="h-[200px]">
                                <ul className="space-y-2">
                                  {task.browser_data.steps.map((step: any, index: number) => (
                                    <li key={index} className="text-sm border-l-2 border-primary pl-2">
                                      <span className="font-medium">Step {step.step}:</span> {step.next_goal}
                                      {step.evaluation_previous_goal && step.evaluation_previous_goal !== 'N/A' && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          <span className="font-medium">Evaluation:</span> {step.evaluation_previous_goal}
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </ScrollArea>
                            ) : (
                              <p className="text-sm text-gray-500">No step information available</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Add recordings section that displays videos even for failed tasks */}
                        {task.browser_task_id && hasRecordings(task) && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Session Recording</h4>
                            <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                              <iframe 
                                src={getRecordingUrl(task)} 
                                className="w-full h-full" 
                                title="Task Recording" 
                                allowFullScreen 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
