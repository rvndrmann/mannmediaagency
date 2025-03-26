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
import { 
  CalendarClock, 
  RotateCcw, 
  PlayCircle, 
  CheckCircle, 
  Timer, 
  AlertCircle,
  Info,
  Trash2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StatusBadgeVariant = "info" | "success" | "destructive" | "warning" | "outline";

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  className?: string;
}

export function ScheduledTasksList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);
  const [lastRunResult, setLastRunResult] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);

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

  const getStatusBadgeProps = (status: string): StatusBadgeProps => {
    switch (status) {
      case 'active':
        return { 
          variant: "info", 
          className: "bg-blue-50 text-blue-700 border-blue-200" 
        };
      case 'completed':
        return { 
          variant: "success", 
          className: "bg-green-50 text-green-700 border-green-200" 
        };
      case 'failed':
        return { 
          variant: "destructive", 
          className: "bg-red-50 text-red-700 border-red-200" 
        };
      case 'pending':
        return { 
          variant: "warning", 
          className: "bg-amber-50 text-amber-700 border-amber-200" 
        };
      default:
        return { 
          variant: "outline"
        };
    }
  };

  const getStatusIcon = (status: string) => {
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

  const formatDate = (dateStr: string) => {
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
        { 
          method: 'POST',
          body: { 
            manual: true,
            timestamp: new Date().toISOString()
          }
        }
      );
      
      if (error) throw error;
      
      console.log("Scheduler response:", data);
      setLastRunResult(data);
      
      if (data.success) {
        if (data.tasksProcessed && data.tasksProcessed > 0) {
          toast.success(`Scheduler processed ${data.tasksProcessed} task(s) successfully.`);
        } else if (data.tasksFound && data.tasksFound > 0) {
          toast.success(`Scheduler found ${data.tasksFound} task(s) to run.`);
        } else {
          toast.info('No tasks are due to run at this time.');
        }
      } else {
        toast.error(`Scheduler error: ${data.message}`);
      }
      
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

  const handleDeleteTask = async (taskId: string) => {
    try {
      setDeletingTask(true);
      
      const { data, error } = await supabase.functions.invoke(
        'browser-use-api',
        { 
          method: 'POST',
          body: { 
            action: 'deleteScheduledTask',
            taskId
          }
        }
      );
      
      if (error) throw error;
      
      if (data.success) {
        toast.success('Scheduled task deleted successfully');
        fetchScheduledTasks(); // Refresh the list
      } else {
        toast.error(`Failed to delete task: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting scheduled task:', error);
      toast.error('Failed to delete scheduled task');
    } finally {
      setDeletingTask(false);
      setTaskToDelete(null);
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

      {lastRunResult && (
        <Alert variant={lastRunResult.success ? "success" : "destructive"} className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {lastRunResult.success 
              ? `Scheduler ran successfully at ${new Date(lastRunResult.timestamp).toLocaleTimeString()}. ${
                  lastRunResult.tasksProcessed > 0 
                    ? `Processed ${lastRunResult.tasksProcessed} task(s).` 
                    : lastRunResult.tasksFound > 0 
                      ? `Found ${lastRunResult.tasksFound} task(s) ready to run.` 
                      : 'No tasks are due to run at this time.'
                }`
              : `Scheduler error at ${new Date(lastRunResult.timestamp).toLocaleTimeString()}: ${lastRunResult.message}`
            }
          </AlertDescription>
        </Alert>
      )}

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
                <TableHead className="text-right">Actions</TableHead>
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
                    <Badge 
                      variant={getStatusBadgeProps(task.status).variant} 
                      className={getStatusBadgeProps(task.status).className}
                    >
                      <div className="flex items-center">
                        {getStatusIcon(task.status)}
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTaskToDelete(task)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scheduled task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTask}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (taskToDelete) {
                  handleDeleteTask(taskToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingTask}
            >
              {deletingTask ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
