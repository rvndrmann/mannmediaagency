
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, ArrowUpRight, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TaskStatus } from "@/hooks/browser-use/types";
import { toast } from "sonner";

type HistoryItem = {
  id: string;
  user_id: string;
  task_input: string;
  status: TaskStatus;
  browser_task_id: string | null;
  screenshot_url: string | null;
  result_url: string | null;
  browser_data: any;
  created_at: string;
  completed_at: string | null;
  output: any;
};

export function BrowserTaskHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('browser_task_history')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setHistory(data || []);
      } catch (error) {
        console.error("Error fetching browser task history:", error);
        toast.error("Failed to load task history");
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [reloadKey]);
  
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="flex items-center gap-1">Running</Badge>;
      case 'completed':
        return <Badge variant="success" className="bg-green-500 text-white">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'paused':
        return <Badge variant="outline">Paused</Badge>;
      case 'stopped':
        return <Badge variant="secondary">Stopped</Badge>;
      case 'pending':
      case 'created':
        return <Badge variant="secondary">Pending</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  const reloadHistory = () => {
    setReloadKey(prev => prev + 1);
  };
  
  const continueTask = async (task: HistoryItem) => {
    // Here you would implement the logic to recreate a task with the same input
    try {
      // Redirect to the Browser Use page
      // You could also call the API directly here if you prefer
      window.location.href = `/browser-use?task=${encodeURIComponent(task.task_input)}`;
    } catch (error) {
      console.error("Error continuing task:", error);
      toast.error("Failed to continue task");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Task History</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={reloadHistory}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>
      
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No browser tasks have been executed yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="max-w-[300px] truncate">
                    {task.task_input}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {task.result_url ? (
                      <a 
                        href={task.result_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Result
                      </a>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => continueTask(task)}
                      className="gap-1"
                    >
                      <Play className="h-4 w-4" />
                      Reuse
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
