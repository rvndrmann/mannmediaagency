
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
  Monitor,
  Clock,
  Calendar,
  Check,
  X,
  Pause,
  StopCircle,
  MessageCircle
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { TaskStatus, BrowserTaskHistory as BrowserTaskHistoryType } from "@/hooks/browser-use/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type HistoryItem = BrowserTaskHistoryType;

interface BrowserTaskHistoryProps {
  onLoadTask?: (taskId: string) => void;
}

export function BrowserTaskHistory({ onLoadTask }: BrowserTaskHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState("details");

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
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-blue-500">
            <Play className="h-3 w-3" />
            Running
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="success" className="bg-green-500 text-white flex items-center gap-1">
            <Check className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <X className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Pause className="h-3 w-3" />
            Paused
          </Badge>
        );
      case 'stopped':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <StopCircle className="h-3 w-3" />
            Stopped
          </Badge>
        );
      case 'pending':
      case 'created':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <X className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  const reloadHistory = () => {
    setReloadKey(prev => prev + 1);
  };
  
  const continueTask = async (task: HistoryItem) => {
    if (onLoadTask) {
      onLoadTask(task.browser_task_id || '');
      toast.success("Task loaded");
    } else {
      window.location.href = `/browser-use?task=${encodeURIComponent(task.task_input)}`;
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

  const renderTaskSteps = (task: HistoryItem) => {
    if (!task.steps || !Array.isArray(task.steps) || task.steps.length === 0) {
      return <p>No detailed steps available</p>;
    }
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-2">Task Steps</h3>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {task.steps.map((step: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {step.goal || step.next_goal || `Step ${index + 1}`}
                  </TableCell>
                  <TableCell>
                    {step.status === 'completed' ? (
                      <Badge className="bg-green-500 text-white">Completed</Badge>
                    ) : step.status === 'in_progress' ? (
                      <Badge className="bg-blue-500">In Progress</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[300px] truncate">
                      {step.details || step.evaluation || 'No details'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="max-w-[300px] truncate">
                    <div className="flex flex-col">
                      <span className="truncate font-medium">{task.task_input}</span>
                      <span className="text-xs text-muted-foreground">
                        ID: {task.browser_task_id || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap">{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.completed_at ? (
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">{formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not completed</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => showTaskDetails(task)}
                        className="gap-1"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Details
                      </Button>
                      
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => continueTask(task)}
                        className="gap-1"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              Task ID: {selectedItem?.browser_task_id || 'N/A'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="h-full">
              <Tabs value={detailsActiveTab} onValueChange={setDetailsActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="media">Media & Recordings</TabsTrigger>
                  <TabsTrigger value="steps">Task Steps</TabsTrigger>
                  <TabsTrigger value="output">Output</TabsTrigger>
                </TabsList>
                
                <ScrollArea className="max-h-[500px]">
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">Task Information</h3>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Status:</span> {getStatusBadge(selectedItem.status)}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {format(new Date(selectedItem.created_at), 'PPpp')}
                          </div>
                          {selectedItem.completed_at && (
                            <div>
                              <span className="font-medium">Completed:</span> {format(new Date(selectedItem.completed_at), 'PPpp')}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Browser Task ID:</span> {selectedItem.browser_task_id || 'N/A'}
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">Task Description</h3>
                        <p className="text-sm whitespace-pre-wrap">{selectedItem.task_input}</p>
                      </Card>
                    </div>
                    
                    {selectedItem.result_url && (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">Live Result</h3>
                        <div className="flex items-center gap-2">
                          <a 
                            href={selectedItem.result_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open Live Result
                          </a>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => continueTask(selectedItem)}
                          >
                            <Play className="h-4 w-4 mr-1" /> Resume This Task
                          </Button>
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="media">
                    {renderBrowserData(selectedItem)}
                  </TabsContent>
                  
                  <TabsContent value="steps">
                    {renderTaskSteps(selectedItem)}
                  </TabsContent>
                  
                  <TabsContent value="output">
                    {selectedItem.output ? (
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-2">Task Output</h3>
                        <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-[400px] whitespace-pre-wrap">
                          {typeof selectedItem.output === 'string' 
                            ? selectedItem.output 
                            : JSON.stringify(selectedItem.output, null, 2)}
                        </pre>
                      </Card>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No output available for this task.</p>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
              
              <DialogFooter className="mt-4">
                <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                <Button onClick={() => continueTask(selectedItem)} variant="default">
                  <Play className="h-4 w-4 mr-1" /> Resume This Task
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
