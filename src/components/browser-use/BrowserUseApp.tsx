
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserUseTask } from "@/hooks/browser-use/use-browser-use-task";
import { BrowserConfigPanel } from "./BrowserConfigPanel";
import { TaskMonitor } from "./TaskMonitor";
import { BrowserTaskHistory } from "./BrowserTaskHistory";
import { BrowserView } from "./BrowserView";
import { TaskTemplateSelector } from "./TaskTemplateSelector";
import { ScheduledTasksList } from "./ScheduledTasksList";
import { useUserCredits } from "@/hooks/use-user-credits";
import { useAuth } from "@/hooks/use-auth";
import { 
  Bot, 
  History, 
  Settings, 
  Play, 
  Pause, 
  StopCircle, 
  RotateCw, 
  Terminal, 
  Monitor, 
  AlertTriangle,
  Info,
  Globe,
  Database,
  Shield,
  FileText,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useLocation } from "react-router-dom";

export function BrowserUseApp() {
  const location = useLocation();
  const { user } = useAuth();
  const { data: userCredits } = useUserCredits();
  const [activeTab, setActiveTab] = useState("task");
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(true);
  const [taskInput, setTaskInput] = useState("");
  const [browserConfig, setBrowserConfig] = useState({});
  const [environment, setEnvironment] = useState<'browser' | 'desktop'>('browser');
  const [currentUrl, setCurrentUrl] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  
  const {
    submitTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask,
    isLoading,
    error,
    taskStatus,
    progress,
    taskOutput,
    connectionStatus,
    liveUrl,
    currentTaskId
  } = useBrowserUseTask();

  const captureScreenshot = () => {
    // Placeholder function
    console.log("Capture screenshot functionality not implemented");
  };

  useEffect(() => {
    if (location.state && location.state.executeScheduledTask) {
      const { taskInput: scheduledTaskInput, browserConfig: scheduledConfig } = location.state;
      
      if (scheduledTaskInput) {
        setTaskInput(scheduledTaskInput);
      }
      
      if (scheduledConfig) {
        setBrowserConfig(scheduledConfig);
      }
      
      setTimeout(() => {
        if (scheduledTaskInput && userCredits && userCredits.credits_remaining > 0) {
          handleStartTask();
          toast.info("Executing scheduled task automatically");
        }
      }, 500);
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state, userCredits]);

  const handleTemplateSelection = (template: any) => {
    console.log("Template selection in BrowserUseApp:", template);
    
    if (template) {
      if (template.task_input) {
        setTaskInput(template.task_input);
      }
      
      if (template.browser_config) {
        setBrowserConfig(template.browser_config);
      }
      
      if (activeTab === "templates") {
        setActiveTab("task");
      }
      
      toast.success(`Template "${template.name}" loaded`);
    }
  };

  const isConfigValid = () => {
    if (environment === "desktop") {
      const hasConnectionMethod = 
        browserConfig.wssUrl || 
        browserConfig.cdpUrl || 
        browserConfig.browserInstancePath ||
        (browserConfig.useOwnBrowser && browserConfig.chromePath);
      
      return !!hasConnectionMethod;
    }
    return true;
  };

  const getConnectionMethodName = () => {
    if (browserConfig.wssUrl) return "WebSocket (WSS)";
    if (browserConfig.cdpUrl) return "Chrome DevTools Protocol";
    if (browserConfig.browserInstancePath) return "Browser Instance";
    if (browserConfig.useOwnBrowser && browserConfig.chromePath) return "Local Chrome";
    return "Default Cloud";
  };

  const handleStartTask = async () => {
    if (!isConfigValid()) {
      if (environment === "desktop") {
        toast.warning("Desktop mode requires a connection method. Please configure it in Settings tab.");
        setActiveTab("settings");
        return;
      }
    }
    
    if (!user?.id || !taskInput.trim()) {
      toast.error("Please enter a task and ensure you're logged in");
      return;
    }
    
    try {
      await submitTask(taskInput, user.id);
    } catch (error) {
      console.error('Error starting task:', error);
      toast.error('Failed to start task');
    }
  };

  const handlePauseTask = async () => {
    if (!currentTaskId) return;
    try {
      await pauseTask();
    } catch (error) {
      console.error('Error pausing task:', error);
      toast.error('Failed to pause task');
    }
  };

  const handleResumeTask = async () => {
    if (!currentTaskId) return;
    try {
      await resumeTask();
    } catch (error) {
      console.error('Error resuming task:', error);
      toast.error('Failed to resume task');
    }
  };

  const handleStopTask = async () => {
    if (!currentTaskId) return;
    try {
      await stopTask();
    } catch (error) {
      console.error('Error stopping task:', error);
      toast.error('Failed to stop task');
    }
  };

  const handleRestartTask = async () => {
    if (!taskInput.trim() || !userCredits || userCredits.credits_remaining < 1 || !user?.id) {
      return;
    }
    try {
      await submitTask(taskInput, user.id);
    } catch (error) {
      console.error('Error restarting task:', error);
      toast.error('Failed to restart task');
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Browser Automation</h1>
          {userCredits && (
            <Badge variant="outline" className="ml-2">
              Credits: {userCredits.credits_remaining}
            </Badge>
          )}
        </div>
        
        {browserConfig.proxy && (
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200">
            <Shield className="h-4 w-4 mr-1" />
            Proxy Active
          </Badge>
        )}
      </div>

      <Tabs defaultValue="task" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="task" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>Task Setup</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Task History</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger 
            value="scheduled" 
            disabled 
            className="opacity-50 cursor-not-allowed"
          >
            <Calendar className="h-4 w-4" />
            <span>Scheduled</span>
            <Badge variant="outline" className="ml-1 text-xs">Coming Soon</Badge>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="task" className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Label className="font-medium min-w-[100px]">Environment:</Label>
                  <Badge 
                    variant="outline" 
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    <Monitor className="h-4 w-4 mr-1" />
                    Browser
                  </Badge>
                </div>

                {environment === "desktop" && (
                  <div className="flex items-center gap-4">
                    <Label className="font-medium min-w-[100px]">Connection:</Label>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {browserConfig.wssUrl && <Database className="h-3 w-3" />}
                      {browserConfig.cdpUrl && <Terminal className="h-3 w-3" />}
                      {browserConfig.browserInstancePath && <Monitor className="h-3 w-3" />}
                      {!browserConfig.wssUrl && !browserConfig.cdpUrl && !browserConfig.browserInstancePath && <Globe className="h-3 w-3" />}
                      {getConnectionMethodName()}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Configure connection methods in the Settings tab. For desktop automation, 
                            you need to configure a connection method like Local Chrome, WebSocket (WSS), 
                            Chrome DevTools Protocol, or Browser Instance.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Quick Templates
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowTemplatesPanel(!showTemplatesPanel)}
                    >
                      {showTemplatesPanel ? "Hide Templates" : "Show Templates"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("templates")}
                    >
                      Browse All Templates
                    </Button>
                  </div>
                </div>
                
                {showTemplatesPanel && (
                  <TaskTemplateSelector
                    onSelectTemplate={handleTemplateSelection}
                    currentTaskInput={taskInput}
                    currentBrowserConfig={browserConfig}
                    displayMode="compact"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="task-input" className="block text-sm font-medium mb-1">
                  Task Description
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="task-input"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="flex-1 min-h-[120px] p-2 border rounded-md"
                    placeholder="Describe what you want the browser to do..."
                    disabled={isLoading}
                  />
                </div>
                
                {environment === "desktop" && !isConfigValid() && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      Desktop mode requires a connection method. Please configure it in the Settings tab.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleStartTask}
                  disabled={isLoading || !taskInput.trim() || !userCredits || userCredits.credits_remaining < 1}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Browser Task (1 Credit)
                </Button>

                {taskStatus === 'running' && (
                  <Button
                    onClick={handlePauseTask}
                    disabled={taskStatus !== 'running'}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                )}

                {taskStatus === 'paused' && (
                  <Button
                    onClick={handleResumeTask}
                    disabled={taskStatus !== 'paused'}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                )}

                {(taskStatus === 'running' || taskStatus === 'paused') && (
                  <Button
                    onClick={handleStopTask}
                    disabled={taskStatus !== 'running' && taskStatus !== 'paused'}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <StopCircle className="h-4 w-4" />
                    Stop
                  </Button>
                )}

                {(taskStatus === 'completed' || taskStatus === 'stopped' || taskStatus === 'failed' || taskStatus === 'expired') && (
                  <Button
                    onClick={handleRestartTask}
                    disabled={!taskInput.trim() || !userCredits || userCredits.credits_remaining < 1}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    Restart Task (1 Credit)
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BrowserView
              liveUrl={liveUrl}
              currentUrl={currentUrl}
              setCurrentUrl={setCurrentUrl}
              screenshot={screenshot}
              captureScreenshot={captureScreenshot}
              connectionStatus={connectionStatus}
              environment={environment}
            />

            <TaskMonitor
              taskStatus={taskStatus}
              progress={progress}
              error={error}
              isProcessing={isLoading}
              taskOutput={taskOutput}
              environment={environment}
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <BrowserTaskHistory />
        </TabsContent>

        <TabsContent value="templates">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  Task Templates
                </h2>
              </div>
              
              <p className="text-muted-foreground">
                Save and manage your task templates to quickly reuse them for future browser automation tasks.
              </p>
              
              <TaskTemplateSelector
                onSelectTemplate={handleTemplateSelection}
                currentTaskInput={taskInput}
                currentBrowserConfig={browserConfig}
                displayMode="standard"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledTasksList />
        </TabsContent>

        <TabsContent value="settings">
          <BrowserConfigPanel
            config={browserConfig}
            setConfig={setBrowserConfig}
            disabled={isLoading}
            environment={environment}
            setEnvironment={setEnvironment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
