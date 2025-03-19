
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserUseTask } from "@/hooks/browser-use/use-browser-use-task";
import { BrowserSettings } from "./BrowserSettings";
import { TaskControls } from "./TaskControls";
import { TaskProgress } from "./TaskProgress";
import { TaskOutput } from "./TaskOutput";
import { LivePreview } from "./LivePreview";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { TaskStatus } from "@/hooks/browser-use/types";

export function BrowserUseApp() {
  const [activeTab, setActiveTab] = useState<string>("task");
  
  const {
    taskInput,
    setTaskInput,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    isProcessing,
    progress,
    taskSteps,
    taskStatus,
    currentUrl,
    taskOutput,
    error,
    browserConfig,
    setBrowserConfig,
    userCredits,
    liveUrl,
    captureScreenshot
  } = useBrowserUseTask();
  
  // Log changes to liveUrl for debugging
  useEffect(() => {
    console.log(`BrowserUseApp: liveUrl changed to: ${liveUrl}`);
  }, [liveUrl]);
  
  // Show toast when live URL becomes available
  useEffect(() => {
    if (liveUrl) {
      if (liveUrl.endsWith('.mp4') || liveUrl.endsWith('.webm') || liveUrl.includes('recording')) {
        toast.success("Session recording is now available!");
      } else {
        toast.success("Live preview is now available!");
      }
    }
  }, [liveUrl]);
  
  // Auto-switch to output tab when task is complete
  useEffect(() => {
    if (['finished', 'failed', 'stopped', 'completed'].includes(taskStatus) && isProcessing === false) {
      setActiveTab("output");
    }
  }, [taskStatus, isProcessing]);
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="task">Task</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
              </TabsList>
              
              <TabsContent value="task" className="space-y-4 mt-4">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="task-input">Task Description</Label>
                  <Textarea
                    id="task-input"
                    placeholder="Describe what you want the browser to do..."
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="min-h-[100px] resize-y"
                    disabled={isProcessing}
                  />
                </div>
                
                <TaskControls
                  taskStatus={taskStatus}
                  isProcessing={isProcessing}
                  userCredits={userCredits}
                  onStart={startTask}
                  onPause={pauseTask}
                  onResume={resumeTask}
                  onStop={stopTask}
                  onScreenshot={captureScreenshot}
                  error={error}
                />
                
                {isProcessing && (
                  <TaskProgress 
                    progress={progress} 
                    status={taskStatus}
                    steps={taskSteps}
                    currentUrl={currentUrl}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4 mt-4">
                <BrowserSettings 
                  config={browserConfig}
                  onConfigChange={setBrowserConfig}
                />
              </TabsContent>
              
              <TabsContent value="output" className="space-y-4 mt-4">
                <TaskOutput 
                  output={taskOutput}
                  taskSteps={taskSteps}
                  taskStatus={taskStatus}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Always render the LivePreview component, even when liveUrl is null */}
        <LivePreview 
          liveUrl={liveUrl} 
          isRunning={isProcessing && taskStatus === 'running'} 
        />
      </div>
    </div>
  );
}
