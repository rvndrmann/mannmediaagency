import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserUseTask } from "@/hooks/browser-use/use-browser-use-task";
import { BrowserConfigPanel } from "./BrowserConfigPanel";
import { TaskMonitor } from "./TaskMonitor";
import { BrowserTaskHistory } from "./BrowserTaskHistory";
import { BrowserView } from "./BrowserView";
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
  Laptop,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrowserUseApp() {
  const [activeTab, setActiveTab] = useState("task");
  
  const {
    taskInput,
    setTaskInput,
    isProcessing,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    restartTask,
    progress,
    taskStatus,
    currentUrl,
    setCurrentUrl,
    screenshot,
    captureScreenshot,
    userCredits,
    error,
    browserConfig,
    setBrowserConfig,
    liveUrl,
    connectionStatus,
    taskOutput,
    environment,
    setEnvironment
  } = useBrowserUseTask();

  const handleStartTask = () => {
    // Use the selected environment type when starting a task
    if (environment === "desktop" && !browserConfig.useOwnBrowser) {
      toast.warning("Desktop mode requires using your own browser. Please enable it in Settings tab.");
      setActiveTab("settings");
      return;
    }
    
    if (environment === "desktop" && !browserConfig.chromePath) {
      toast.warning("Desktop mode requires a Chrome executable path. Please set it in Settings tab.");
      setActiveTab("settings");
      return;
    }
    
    startTask(environment);
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
      </div>

      <Tabs defaultValue="task" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="task" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>Task Setup</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Task History</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="task" className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex flex-row gap-4 items-center">
                <Label className="font-medium">Environment:</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={environment === "browser" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setEnvironment("browser")}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    Browser
                  </Button>
                  <Button 
                    variant={environment === "desktop" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setEnvironment("desktop")}
                    className="flex items-center gap-2"
                  >
                    <Laptop className="h-4 w-4" />
                    Desktop
                  </Button>
                </div>
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
                    placeholder={environment === "browser" 
                      ? "Describe what you want the browser to do..." 
                      : "Describe what you want to automate on your desktop..."}
                    disabled={isProcessing}
                  />
                </div>
                
                {environment === "desktop" && !browserConfig.useOwnBrowser && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      Desktop mode requires using your own browser. Please enable it in the Settings tab.
                    </AlertDescription>
                  </Alert>
                )}
                
                {environment === "desktop" && !browserConfig.chromePath && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      Desktop mode requires the Chrome executable path. Please set it in the Settings tab.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleStartTask}
                  disabled={isProcessing || !taskInput.trim() || !userCredits || userCredits.credits_remaining < 1}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start {environment === "browser" ? "Browser" : "Desktop"} Task (1 Credit)
                </Button>

                {taskStatus === 'running' && (
                  <Button
                    onClick={pauseTask}
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
                    onClick={resumeTask}
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
                    onClick={stopTask}
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
                    onClick={restartTask}
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
              isProcessing={isProcessing}
              taskOutput={taskOutput}
              environment={environment}
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <BrowserTaskHistory />
        </TabsContent>

        <TabsContent value="settings">
          <BrowserConfigPanel
            config={browserConfig}
            setConfig={setBrowserConfig}
            disabled={isProcessing}
            environment={environment}
            setEnvironment={setEnvironment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
