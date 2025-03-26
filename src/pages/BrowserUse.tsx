
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Play, Pause, StopCircle, RotateCcw, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface BrowserTask {
  id: string;
  task: string;
  status: string;
  created_at: string;
  live_url?: string;
  output?: string;
}

const BrowserUsePage = () => {
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get("task");
  
  const [tasks, setTasks] = useState<BrowserTask[]>([]);
  const [activeTask, setActiveTask] = useState<BrowserTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [environment, setEnvironment] = useState("browser");
  const [intervalId, setIntervalId] = useState<number | null>(null);

  useEffect(() => {
    fetchTasks();
    
    // Set up polling for task updates
    const id = window.setInterval(() => {
      if (activeTask) {
        fetchTaskDetails(activeTask.id);
      }
    }, 5000);
    
    setIntervalId(id);
    
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeTask]);
  
  useEffect(() => {
    if (taskIdFromUrl) {
      fetchTaskDetails(taskIdFromUrl);
    }
  }, [taskIdFromUrl]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "list" }
      });
      
      if (error) throw error;
      
      setTasks(data.tasks || []);
      
      if (taskIdFromUrl && data.tasks) {
        const foundTask = data.tasks.find((t: any) => t.id === taskIdFromUrl);
        if (foundTask) {
          setActiveTask(foundTask);
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "get", taskId }
      });
      
      if (error) throw error;
      
      setActiveTask(data);
      
      // Also update the task in the tasks list
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: data.status } : task
        )
      );
    } catch (error) {
      console.error("Error fetching task details:", error);
    }
  };

  const startNewTask = async () => {
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    try {
      setIsTaskLoading(true);
      
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { 
          task: taskInput,
          environment
        }
      });
      
      if (error) throw error;
      
      toast.success("Task started successfully");
      setTaskInput("");
      
      // Fetch the new task details
      await fetchTaskDetails(data.taskId);
      await fetchTasks();
      
    } catch (error) {
      console.error("Error starting task:", error);
      toast.error("Failed to start task: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsTaskLoading(false);
    }
  };

  const stopTask = async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "stop", taskId }
      });
      
      if (error) throw error;
      
      toast.success("Task stopped");
      await fetchTaskDetails(taskId);
    } catch (error) {
      console.error("Error stopping task:", error);
      toast.error("Failed to stop task");
    }
  };

  const pauseTask = async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "pause", taskId }
      });
      
      if (error) throw error;
      
      toast.success("Task paused");
      await fetchTaskDetails(taskId);
    } catch (error) {
      console.error("Error pausing task:", error);
      toast.error("Failed to pause task");
    }
  };

  const resumeTask = async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "resume", taskId }
      });
      
      if (error) throw error;
      
      toast.success("Task resumed");
      await fetchTaskDetails(taskId);
    } catch (error) {
      console.error("Error resuming task:", error);
      toast.error("Failed to resume task");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Browser Automation</h1>
      
      <Tabs defaultValue={activeTask ? "viewing" : "create"} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="create">Create Task</TabsTrigger>
          <TabsTrigger value="viewing" disabled={!activeTask}>View Task</TabsTrigger>
          <TabsTrigger value="history">Task History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Browser Task</CardTitle>
              <CardDescription>
                Describe what you want the browser to do
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="browser"
                      value="browser"
                      checked={environment === "browser"}
                      onChange={() => setEnvironment("browser")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="browser">Browser</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="desktop"
                      value="desktop"
                      checked={environment === "desktop"}
                      onChange={() => setEnvironment("desktop")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="desktop">Desktop</Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task">Task Description</Label>
                <Textarea
                  id="task"
                  placeholder="E.g., Go to Twitter, search for AI news, and take screenshots of the top 3 posts"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-gray-500">
                  Be specific about what you want the browser to do. The AI will follow your instructions step by step.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={startNewTask} disabled={isTaskLoading}>
                {isTaskLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting task...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Task
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="viewing">
          {activeTask ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Task: {activeTask.id}</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    activeTask.status === 'finished' ? 'bg-green-100 text-green-800' :
                    activeTask.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    activeTask.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    activeTask.status === 'stopped' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activeTask.status.toUpperCase()}
                  </span>
                </CardTitle>
                <CardDescription>
                  Created: {formatDate(activeTask.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Task Description</h3>
                  <p className="p-3 bg-gray-50 rounded">{activeTask.task}</p>
                </div>
                
                {activeTask.live_url && (
                  <div>
                    <h3 className="font-medium mb-2">Live View</h3>
                    <div className="relative pt-[56.25%] bg-gray-100 rounded overflow-hidden">
                      <iframe 
                        src={activeTask.live_url} 
                        className="absolute top-0 left-0 w-full h-full border-0"
                        title="Browser Task Live View"
                      ></iframe>
                    </div>
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(activeTask.live_url, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in new tab
                      </Button>
                    </div>
                  </div>
                )}
                
                {activeTask.output && (
                  <div>
                    <h3 className="font-medium mb-2">Task Output</h3>
                    <pre className="p-3 bg-gray-50 rounded text-sm overflow-auto max-h-[300px]">
                      {activeTask.output}
                    </pre>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                {activeTask.status === 'running' && (
                  <>
                    <Button variant="outline" onClick={() => pauseTask(activeTask.id)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button variant="destructive" onClick={() => stopTask(activeTask.id)}>
                      <StopCircle className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
                
                {activeTask.status === 'paused' && (
                  <>
                    <Button variant="outline" onClick={() => resumeTask(activeTask.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                    <Button variant="destructive" onClick={() => stopTask(activeTask.id)}>
                      <StopCircle className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
                
                <Button variant="outline" onClick={() => fetchTaskDetails(activeTask.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p>No task selected. Create a new task or select one from history.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Task History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map(task => (
                    <Card key={task.id} className="overflow-hidden cursor-pointer hover:border-blue-300 transition-colors" onClick={() => {
                      setActiveTask(task);
                      const tabTrigger = document.querySelector('[data-state="inactive"][value="viewing"]') as HTMLButtonElement;
                      if (tabTrigger) tabTrigger.click();
                    }}>
                      <div className="flex items-center p-4">
                        <div className="flex-1">
                          <div className="font-medium truncate">{task.task}</div>
                          <div className="text-xs text-gray-500">{formatDate(task.created_at)}</div>
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            task.status === 'finished' ? 'bg-green-100 text-green-800' :
                            task.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'stopped' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p>No tasks found. Create your first task to get started.</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={fetchTasks}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrowserUsePage;
