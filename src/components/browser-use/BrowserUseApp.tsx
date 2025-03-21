
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserUseTask } from "@/hooks/browser-use/use-browser-use-task";
import { BrowserConfigPanel } from "./BrowserConfigPanel";
import { TaskMonitor } from "./TaskMonitor";
import { BrowserTaskHistory } from "./BrowserTaskHistory";
import { BrowserView } from "./BrowserView";
import { Bot, History, Settings, Play, Pause, StopCircle, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskControls } from "./TaskControls";

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
    currentTaskId
  } = useBrowserUseTask();

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Browser Use API</h1>
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
            <Play className="h-4 w-4" />
            <span>Task Execution</span>
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
              <div>
                <label htmlFor="task-input" className="block text-sm font-medium mb-1">
                  Task Description
                </label>
                <div className="flex gap-2">
                  <textarea
                    id="task-input"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="flex-1 min-h-[80px] p-2 border rounded-md"
                    placeholder="Describe what you want the browser to do..."
                    disabled={isProcessing && taskStatus !== 'completed' && taskStatus !== 'failed' && taskStatus !== 'stopped' && taskStatus !== 'expired'}
                  />
                </div>
              </div>

              <TaskControls
                taskStatus={taskStatus}
                isProcessing={isProcessing}
                userCredits={userCredits ? userCredits.credits_remaining : null}
                onStart={startTask}
                onPause={pauseTask}
                onResume={resumeTask}
                onStop={stopTask}
                onScreenshot={captureScreenshot}
                onRestart={restartTask}
                error={error}
                currentTaskId={currentTaskId}
              />
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
            />

            <TaskMonitor
              taskStatus={taskStatus}
              progress={progress}
              error={error}
              isProcessing={isProcessing}
              taskOutput={taskOutput}
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
            disabled={isProcessing && taskStatus !== 'completed' && taskStatus !== 'failed' && taskStatus !== 'stopped' && taskStatus !== 'expired'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
