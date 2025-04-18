"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user"; // Import useUser
import { useUserCredits } from "@/hooks/use-user-credits"; // Import useUserCredits
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Play, Pause, StopCircle, RotateCcw, ExternalLink, Info, Monitor, Key, Shield, CalendarDays, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrowserConfigPanel } from "@/components/browser-use/BrowserConfigPanel";
import { BrowserConfig, SensitiveDataItem } from "@/hooks/browser-use/types";
import { Badge } from "@/components/ui/badge";
import { TaskInputWithPreview } from "@/components/browser-use/TaskInputWithPreview";
import { ChevronLeft } from "lucide-react";
import { TaskTemplateSelector } from "@/components/browser-use/TaskTemplateSelector";
import { ScheduledTasksList } from "@/components/browser-use/ScheduledTasksList";
import { SensitiveDataManager } from "@/components/browser-use/SensitiveDataManager";
import { ProxyHelper } from "@/components/browser-use/ProxyHelper";
import { TaskScheduler } from "@/components/browser-use/TaskScheduler";

const BROWSER_TASK_CREDIT_COST = 1; // Define cost constant

interface BrowserTask {
  id: string;
  task: string;
  status: string;
  created_at: string;
  live_url?: string;
  output?: string;
  browser_config?: BrowserConfig;
}

const getDefaultBrowserConfig = (): BrowserConfig => {
  return {
    headless: false,
    disableSecurity: false,
    useOwnBrowser: false,
    chromePath: "",
    persistentSession: true,
    resolution: "1920x1080",
    theme: "Ocean",
    darkMode: false,
    sensitiveData: [],
    contextConfig: {
      minWaitPageLoadTime: 0.5,
      waitForNetworkIdlePageLoadTime: 5.0,
      maxWaitPageLoadTime: 15.0,
      highlightElements: true,
      viewportExpansion: 500
    }
  };
};

const BrowserUsePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get("task");
  const { user, isAdmin, isLoading: isUserLoading } = useUser(); // Get user, admin status, and loading state
  const { data: userCreditsData, isLoading: isLoadingCredits } = useUserCredits(); // Get credits data and loading state
  
  const [tasks, setTasks] = useState<BrowserTask[]>([]);
  const [activeTask, setActiveTask] = useState<BrowserTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const environment = "browser";
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const [browserConfig, setBrowserConfig] = useState<BrowserConfig>(getDefaultBrowserConfig());
  const [activeTab, setActiveTab] = useState(activeTask ? "viewing" : "create");
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(true);
  
  const [proxyUrl, setProxyUrl] = useState(browserConfig.proxy || "");
  
  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    // fetchTasks(); // Removed initial call from here, will be called when user loads
    
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
  }, [activeTask]); // Keep dependency for interval logic

  // Fetch tasks only when user is loaded
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);
  
  useEffect(() => {
    if (taskIdFromUrl) {
      fetchTaskDetails(taskIdFromUrl);
    }
  }, [taskIdFromUrl]);

  // Effect to redirect non-admins
  useEffect(() => {
    // Wait until user loading is complete before checking admin status
    if (!isUserLoading && !isAdmin) {
      toast.error("Access Denied: You do not have permission to view this page.");
      navigate("/", { replace: true }); // Redirect to home page
    }
  }, [isAdmin, isUserLoading, navigate]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { action: "list", userId: user?.id } // Add userId to the request
      });
      
      if (error) throw error;
      
      setTasks(data.tasks || []);
      
      if (taskIdFromUrl && data.tasks) {
        const foundTask = data.tasks.find((t: any) => t.id === taskIdFromUrl);
        if (foundTask) {
          setActiveTask(foundTask);
          setActiveTab("viewing");
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
      
      if (data.browser_config) {
        setBrowserConfig(data.browser_config);
      }
      
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: data.status } : task
        )
      );
    } catch (error) {
      console.error("Error fetching task details:", error);
    }
  };

  const handleProxyUrlChange = (url: string) => {
    setProxyUrl(url);
    setBrowserConfig({
      ...browserConfig,
      proxy: url
    });
  };
  
  const validateOwnBrowserConfig = () => {
    if (browserConfig.useOwnBrowser) {
      if (!browserConfig.chromePath) {
        toast.error("Chrome executable path is required when using your own browser");
        return false;
      }
      
      if (browserConfig.chromePath && !browserConfig.chromePath.includes("/") && !browserConfig.chromePath.includes("\\")) {
        toast.warning("Chrome path should be an absolute path to the Chrome executable");
      }
    }
    return true;
  };

  const handleSensitiveDataChange = (data: SensitiveDataItem[]) => {
    setBrowserConfig({
      ...browserConfig,
      sensitiveData: data
    });
  };

  const startNewTask = async () => {
    if (!taskInput.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    if (!validateOwnBrowserConfig()) {
      return;
    }
    
    try {
      setIsTaskLoading(true);
      
      const placeholderPattern = /\{([^}]+)\}/g;
      const placeholdersInTask = [...taskInput.matchAll(placeholderPattern)].map(match => match[1]);
      
      const definedKeys = browserConfig.sensitiveData?.map(item => item.key) || [];
      const undefinedPlaceholders = placeholdersInTask.filter(p => !definedKeys.includes(p));
      
      if (undefinedPlaceholders.length > 0) {
        toast.warning(`You used placeholder(s) ${undefinedPlaceholders.join(', ')} in your task but haven't defined them. Please add them in Browser Settings > Sensitive Data.`);
        setIsTaskLoading(false);
        setActiveTab("settings");
        return;
      }
      
      // Ensure user ID is available before invoking
      if (!user?.id) {
        toast.error("User not found. Please log in again.");
        setIsTaskLoading(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: {
          task: taskInput,
          environment,
          browser_config: browserConfig,
          userId: user.id // Pass userId
        }
      });
      
      if (error) throw error;
      
      toast.success("Task started successfully");
      setTaskInput("");
      
      await fetchTaskDetails(data.taskId);
      await fetchTasks();
      setActiveTab("viewing");
      
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

  const handleSelectTemplate = (template: any) => {
    setTaskInput(template.task_input);
    if (template.browser_config) {
      setBrowserConfig(template.browser_config);
    }
    toast.success(`Template "${template.name}" loaded`);
    setShowTemplatesPanel(false);
  };

  // Render loading state or null if user/admin status is still loading or if user is not admin
  if (isUserLoading || !isAdmin) {
    // Optional: Show a loading indicator or specific message
    // Returning null prevents rendering the page content prematurely or for non-admins
    return <div className="flex items-center justify-center min-h-screen">Loading user data...</div>;
  }

  // Only render the page content if loading is complete and user is admin
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleGoBack} 
          className="mr-4"
        >
          <ChevronLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Browser Worker AI</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="create">Create Task</TabsTrigger>
          <TabsTrigger value="viewing" disabled={!activeTask}>View Task</TabsTrigger>
          <TabsTrigger value="history">Task History</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Tasks</TabsTrigger>
          <TabsTrigger value="settings">Browser Settings</TabsTrigger>
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                    <Monitor className="h-4 w-4 mr-1" />
                    Browser
                  </Badge>
                  
                  {browserConfig.proxy && (
                    <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                      <Shield className="h-4 w-4 mr-1" />
                      Proxy Enabled
                    </Badge>
                  )}
                  
                  {browserConfig.sensitiveData && browserConfig.sensitiveData.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border-amber-200">
                      <Key className="h-4 w-4 mr-1" />
                      {browserConfig.sensitiveData.length} Secret{browserConfig.sensitiveData.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Task Templates</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowTemplatesPanel(!showTemplatesPanel)}
                  >
                    {showTemplatesPanel ? "Hide Templates" : "Show Templates"}
                  </Button>
                </div>
                
                {showTemplatesPanel && (
                  <TaskTemplateSelector 
                    onSelectTemplate={handleSelectTemplate}
                    currentTaskInput={taskInput}
                    currentBrowserConfig={browserConfig}
                    displayMode="compact"
                  />
                )}
              </div>
              
              <TaskInputWithPreview
                value={taskInput}
                onChange={setTaskInput}
                sensitiveData={browserConfig.sensitiveData || []}
                isProcessing={isTaskLoading}
              />

              <div className="p-4 rounded-lg border bg-card">
                <SensitiveDataManager
                  sensitiveData={browserConfig.sensitiveData || []}
                  onChange={handleSensitiveDataChange}
                  disabled={isTaskLoading}
                />
              </div>

              {browserConfig.useOwnBrowser && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You're using your own browser. Make sure it's properly configured in the Browser Settings tab.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center"> {/* Added items-center */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("settings")}
                  disabled={isTaskLoading}
                >
                  Configure Browser
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info("Scheduling tasks is coming soon");
                  }}
                  disabled
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Schedule This Task
                  <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
                </Button>
              </div>
              <div className="flex items-center gap-4"> {/* Group button and credits */}
                {/* Credit Display */}
                {!isLoadingCredits && typeof userCreditsData?.credits_remaining === 'number' && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>Cost: {BROWSER_TASK_CREDIT_COST} credit</span>
                    <span>|</span>
                    <span>Available: {userCreditsData.credits_remaining.toFixed(0)} credits</span>
                  </div>
                )}
                {isLoadingCredits && (
                   <div className="text-sm text-muted-foreground flex items-center gap-2">
                     <Loader2 className="h-4 w-4 animate-spin" /> Loading credits...
                   </div>
                )}
                
                {/* Start Task Button */}
                <Button
                  onClick={startNewTask}
                  disabled={
                    isTaskLoading ||
                    !taskInput.trim() ||
                    isLoadingCredits ||
                    typeof userCreditsData?.credits_remaining !== 'number' ||
                    userCreditsData.credits_remaining < BROWSER_TASK_CREDIT_COST
                  }
                >
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
              </div>
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
                <CardDescription className="flex items-center gap-2">
                  <span>Created: {formatDate(activeTask.created_at)}</span>
                  
                  {activeTask.browser_config?.proxy && (
                    <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Using Proxy
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-black dark:text-white">Task Description</h3>
                  <p className="p-3 bg-gray-50 dark:bg-gray-800 text-black dark:text-white rounded">{activeTask.task}</p>
                </div>
                
                {activeTask.browser_config?.useOwnBrowser && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This task is using your own Chrome browser at: {activeTask.browser_config.chromePath}
                    </AlertDescription>
                  </Alert>
                )}
                
                {activeTask.browser_config?.proxy && (
                  <Alert variant="default" className="bg-blue-50 border-blue-200">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      This task is using a proxy: {activeTask.browser_config.proxy}
                    </AlertDescription>
                  </Alert>
                )}
                
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
                    <h3 className="font-medium mb-2 text-black dark:text-white">Task Output</h3>
                    <pre className="p-3 bg-gray-50 dark:bg-gray-800 text-black dark:text-white rounded text-sm overflow-auto max-h-[300px]">
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
                <p className="text-black dark:text-white">No task selected. Create a new task or select one from history.</p>
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
                      setActiveTab("viewing");
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
        
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="h-5 w-5 mr-2" />
                Scheduled Tasks
              </CardTitle>
              <CardDescription>
                Tasks scheduled to run automatically at specific times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 border rounded-lg">
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Schedule New Task
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Schedule the task you created in the "Create Task" tab to run automatically at specific times.
                </p>
                <Button 
                  className="flex items-center gap-2 w-full sm:w-auto"
                  onClick={() => {
                    if (!taskInput.trim()) {
                      toast.error("Please create a task in the Create Task tab first");
                      setActiveTab("create");
                      return;
                    }
                    // Show the schedule dialog
                    document.getElementById("schedule-task-button")?.click();
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  Schedule Current Task
                </Button>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-3">Your Scheduled Tasks</h3>
                <ScheduledTasksList />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Browser Settings</CardTitle>
              <CardDescription>
                Configure how the browser operates for automation tasks
              </CardDescription>
              
              {browserConfig.proxy && (
                <Badge variant="outline" className="flex items-center w-fit gap-1 bg-blue-50 text-blue-700 border-blue-200 mt-2">
                  <Shield className="h-4 w-4 mr-1" />
                  Proxy Active: {browserConfig.proxy}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <BrowserConfigPanel 
                config={browserConfig} 
                setConfig={setBrowserConfig}
                isProcessing={isTaskLoading}
                disabled={isTaskLoading}
              />
              
              <div className="mt-8 p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-4">Sensitive Data Management</h3>
                <SensitiveDataManager
                  sensitiveData={browserConfig.sensitiveData || []}
                  onChange={handleSensitiveDataChange}
                  disabled={isTaskLoading}
                />
              </div>
              
              <ProxyHelper 
                proxyUrl={proxyUrl} 
                onProxyUrlChange={handleProxyUrlChange}
                isProcessing={isTaskLoading} 
              />
              
              {browserConfig.useOwnBrowser && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-800 mb-2">Using Your Own Browser</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    When using your own browser, you must:
                  </p>
                  <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                    <li>Make sure Chrome/Chromium is installed on your system</li>
                    <li>Provide the correct absolute path to the Chrome executable</li>
                    <li>Ensure you have appropriate permissions to launch Chrome</li>
                    <li>Consider using a dedicated Chrome profile for automation</li>
                  </ul>
                  <div className="mt-4">
                    <h4 className="font-medium text-blue-800 mb-1">Common Chrome Executable Paths:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li><strong>Windows:</strong> C:\Program Files\Google\Chrome\Application\chrome.exe</li>
                      <li><strong>macOS:</strong> /Applications/Google Chrome.app/Contents/MacOS/Google Chrome</li>
                      <li><strong>Linux:</strong> /usr/bin/google-chrome or /usr/bin/chromium-browser</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {(browserConfig.sensitiveData && browserConfig.sensitiveData.length > 0) && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                  <h3 className="font-medium text-yellow-800 mb-2">Using Sensitive Data</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    You have configured {browserConfig.sensitiveData.length} sensitive data placeholders.
                  </p>
                  <ul className="text-sm text-yellow-700 list-disc pl-5 space-y-1">
                    <li>Use these placeholder keys in your task description</li>
                    <li>The actual values will be securely substituted when the task runs</li>
                    <li>Example: "Login with username 'admin' and password '{browserConfig.sensitiveData[0]?.key || "my_password"}'."</li>
                    <li>The model only sees the placeholder name, never the actual value</li>
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setBrowserConfig(getDefaultBrowserConfig())}>
                Reset to Defaults
              </Button>
              <Button onClick={() => setActiveTab("create")}>
                Save and Return
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="hidden">
        <TaskScheduler 
          taskInput={taskInput}
          browserConfig={browserConfig}
          triggerId="schedule-task-button"
        />
      </div>
    </div>
  );
};

export default BrowserUsePage;
