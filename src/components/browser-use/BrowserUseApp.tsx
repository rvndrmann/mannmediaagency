
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserUseTask } from "@/hooks/browser-use/use-browser-use-task";
import { BrowserSettings } from "./BrowserSettings";
import { TaskControls } from "./TaskControls";
import { TaskProgress } from "./TaskProgress";
import { TaskOutput } from "./TaskOutput";
import { LivePreview } from "./LivePreview";

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
    liveUrl
  } = useBrowserUseTask();
  
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
                <TaskControls
                  taskInput={taskInput}
                  setTaskInput={setTaskInput}
                  startTask={startTask}
                  pauseTask={pauseTask}
                  resumeTask={resumeTask}
                  stopTask={stopTask}
                  isProcessing={isProcessing}
                  taskStatus={taskStatus}
                  userCredits={userCredits}
                  error={error}
                />
                
                {isProcessing && (
                  <TaskProgress 
                    progress={progress} 
                    currentUrl={currentUrl}
                    taskSteps={taskSteps}
                    taskStatus={taskStatus}
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
        
        {/* Live Preview Section */}
        <LivePreview 
          liveUrl={liveUrl} 
          isRunning={isProcessing && taskStatus === 'running'} 
        />
      </div>
    </div>
  );
}
