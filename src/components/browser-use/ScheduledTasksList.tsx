import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, RotateCcw, PlayCircle, CheckCircle, Timer, AlertCircle } from "lucide-react";

export function ScheduledTasksList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);

  useEffect(() => {
    fetchScheduledTasks();
  }, []);

  const fetchScheduledTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scheduled_browser_tasks')
        .select('*')
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error);
      toast.error('Failed to load scheduled tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeProps = (status) => {
    switch (status) {
      case 'active':
        return { 
          variant: "info" as const, 
          className: "bg-blue-50 text-blue-700 border-blue-200" 
        };
      case 'completed':
        return { 
          variant: "success" as const, 
          className: "bg-green-50 text-green-700 border-green-200" 
        };
      case 'failed':
        return { 
          variant: "destructive" as const, 
          className: "bg-red-50 text-red-700 border-red-200" 
        };
      case 'pending':
        return { 
          variant: "warning" as const, 
          className: "bg-amber-50 text-amber-700 border-amber-200" 
        };
      default:
        return { 
          variant: "outline" as const 
        };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <PlayCircle className="h-4 w-4 mr-1" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 mr-1" />;
      case 'pending':
        return <Timer className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  };

  const triggerScheduler = async () => {
    try {
      setTriggeringScheduler(true);
      toast.info("Triggering scheduler...");
      
      const { data, error } = await supabase.functions.invoke(
        'browser-tasks-scheduler-cron',
        { method: 'POST' }
      );
      
      if (error) throw error;
      
      toast.success("Scheduler triggered successfully");
      // Refresh the task list after a short delay
      setTimeout(() => {
        fetchScheduledTasks();
      }, 2000);
    } catch (error) {
      console.error('Error triggering scheduler:', error);
      toast.error('Failed to trigger scheduler');
    } finally {
      setTriggeringScheduler(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
        <p>Loading scheduled tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center">
          <CalendarClock className="h-5 w-5 mr-2" /> 
          Scheduled Tasks
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchScheduledTasks}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={triggerScheduler}
            disabled={triggeringScheduler}
          >
            {triggeringScheduler ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Scheduler Now
              </>
            )}
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-muted/20">
          <CalendarClock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No scheduled tasks found.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Schedule Type</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium max-w-md truncate">
                    {task.task_input}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {task.schedule_type === 'once' ? 'One-time' : 'Recurring'}
                      {task.repeat_interval && ` (${task.repeat_interval})`}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(task.next_run_at || task.scheduled_time)}</TableCell>
                  <TableCell>{task.last_run_at ? formatDate(task.last_run_at) : 'Never'}</TableCell>
                  <TableCell>
                    <Badge {...getStatusBadgeProps(task.status)} className="flex items-center w-fit">
                      {getStatusIcon(task.status)}
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
