
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { CalendarDays, Clock, RotateCw, Trash2, PlayCircle, XCircle, Key, Shield } from "lucide-react";
import { BrowserConfig } from "@/hooks/browser-use/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScheduledTask {
  id: string;
  task_input: string;
  browser_config: BrowserConfig | null;
  schedule_type: string;
  scheduled_time: string;
  repeat_interval: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  status: string;
  created_at: string;
}

export function ScheduledTasksList() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchScheduledTasks();
  }, []);

  const fetchScheduledTasks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('scheduled_browser_tasks')
        .select('*')
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      // Convert the JSON data to match our ScheduledTask interface
      const formattedTasks = data?.map(task => ({
        ...task,
        browser_config: task.browser_config as BrowserConfig | null,
        repeat_interval: task.repeat_interval as string
      })) || [];
      
      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error fetching scheduled tasks:", error);
      toast.error("Failed to load scheduled tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelTask = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled task?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_browser_tasks')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      
      setTasks(tasks.map(task => 
        task.id === id ? { ...task, status: 'cancelled' } : task
      ));
      
      toast.success("Task cancelled successfully");
    } catch (error) {
      console.error("Error cancelling task:", error);
      toast.error("Failed to cancel task");
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled task?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_browser_tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTasks(tasks.filter(task => task.id !== id));
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <RotateCw className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-gray-500">No scheduled tasks found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id} className={task.status === 'cancelled' ? "opacity-60" : ""}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{getStatusBadge(task.status)}</CardTitle>
                  <p className="text-sm mt-1 line-clamp-2">{task.task_input}</p>
                </div>
                <div className="flex gap-1">
                  {task.status === 'pending' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => cancelTask(task.id)}
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="sr-only">Cancel</span>
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    {format(new Date(task.scheduled_time), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {format(new Date(task.scheduled_time), 'h:mm a')}
                  </span>
                </div>
                {task.schedule_type === 'recurring' && (
                  <div className="col-span-2 mt-1">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      Recurring: {task.repeat_interval?.replace(/^\d+\s/, '') || 'Custom'}
                    </Badge>
                  </div>
                )}
                
                {/* Add sensitive data indicator */}
                {task.browser_config?.sensitiveData && task.browser_config.sensitiveData.length > 0 && (
                  <div className="col-span-2 mt-1">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      {task.browser_config.sensitiveData.length} Secret{task.browser_config.sensitiveData.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
                
                {/* Add proxy indicator */}
                {task.browser_config?.proxy && (
                  <div className="col-span-2 mt-1">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Using Proxy
                    </Badge>
                  </div>
                )}
                
                {task.next_run_at && (
                  <div className="col-span-2 mt-1 text-xs text-gray-500">
                    Next run: {formatDistanceToNow(new Date(task.next_run_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
