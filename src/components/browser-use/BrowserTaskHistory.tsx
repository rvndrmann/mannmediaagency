
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
import { 
  Loader2, 
  Play, 
  ArrowUpRight, 
  ExternalLink, 
  Video,
  Camera,
  Monitor
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TaskStatus, BrowserTaskHistory as BrowserTaskHistoryType } from "@/hooks/browser-use/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type HistoryItem = BrowserTaskHistoryType;

export function BrowserTaskHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        
        // Type cast the data to HistoryItem[] to ensure it's properly typed
        setHistory((data || []) as HistoryItem[]);
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
  
  const showTaskDetails = (task: HistoryItem) => {
    setSelectedItem(task);
    setDetailsOpen(true);
  };
  
  const renderBrowserData = (task: HistoryItem) => {
    if (!task.browser_data) return <p>No recordings available</p>;
    
    const data = task.browser_data as any;
    
    return (
      <div className="space-y-4">
        {data.recordings && data.recordings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Recordings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.recordings.map((recording: any, index: number) => (
                <div key={index} className="border rounded-md p-2">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Recording {index + 1}</h4>
                    <a 
                      href={recording.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <Video className="h-4 w-4" />
                      View
                    </a>
                  </div>
                  {recording.thumbnail && (
                    <a 
                      href={recording.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={recording.thumbnail} 
                        alt={`Recording ${index + 1} thumbnail`} 
                        className="w-full rounded-md border"
                      />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {data.screenshots && data.screenshots.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Screenshots</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.screenshots.map((screenshot: any, index: number) => (
                <div key={index} className="border rounded-md p-2">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Screenshot {index + 1}</h4>
                    <a 
                      href={screenshot.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <Camera className="h-4 w-4" />
                      View
                    </a>
                  </div>
                  <a 
                    href={screenshot.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={screenshot.url} 
                      alt={`Screenshot ${index + 1}`} 
                      className="w-full rounded-md border"
                    />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {(!data.recordings || data.recordings.length === 0) && 
         (!data.screenshots || data.screenshots.length === 0) && (
          <p>No recordings or screenshots available</p>
        )}
      </div>
    );
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
                    <div className="flex space-x-2">
                      {task.result_url ? (
                        <a 
                          href={task.result_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <Monitor className="h-4 w-4" />
                          View Live
                        </a>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                      
                      {task.browser_data && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 h-6 text-blue-500"
                          onClick={() => showTaskDetails(task)}
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Recordings
                        </Button>
                      )}
                    </div>
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
      
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Task</h3>
                <p className="text-sm text-gray-700">{selectedItem.task_input}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-1">Status</h3>
                <div>{getStatusBadge(selectedItem.status)}</div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-1">Recordings and Screenshots</h3>
                {renderBrowserData(selectedItem)}
              </div>
              
              {selectedItem.result_url && (
                <div>
                  <h3 className="text-lg font-semibold mb-1">Live Result</h3>
                  <a 
                    href={selectedItem.result_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Live Result
                  </a>
                </div>
              )}
              
              {selectedItem.output && (
                <div>
                  <h3 className="text-lg font-semibold mb-1">Output</h3>
                  <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-auto max-h-[200px]">
                    {typeof selectedItem.output === 'string' 
                      ? selectedItem.output 
                      : JSON.stringify(selectedItem.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
