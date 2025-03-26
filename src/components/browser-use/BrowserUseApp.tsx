
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserUseTask } from "@/hooks/browser-use/use-browser-use-task";
import { BrowserConfigPanel } from "./BrowserConfigPanel";
import { TaskMonitor } from "./TaskMonitor";
import { BrowserTaskHistory } from "./BrowserTaskHistory";
import { BrowserView } from "./BrowserView";
import { Bot, History, Settings, Play, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskControls } from "./TaskControls";
import { BrowserChatInterface } from "./BrowserChatInterface";

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
    captureScreenshot: originalCaptureScreenshot,
    userCredits,
    error,
    browserConfig,
    setBrowserConfig,
    liveUrl,
    connectionStatus,
    taskOutput,
    currentTaskId,
    browserTaskId,
    loadPreviousTask
  } = useBrowserUseTask();

  // Load previous task on component mount
  useEffect(() => {
    const savedTaskId = localStorage.getItem('workerAI_currentTaskId');
    if (savedTaskId) {
      loadPreviousTask(savedTaskId);
    }
  }, []);

  // Save current task ID to localStorage when it changes
  useEffect(() => {
    if (currentTaskId) {
      localStorage.setItem('workerAI_currentTaskId', currentTaskId);
    }
  }, [currentTaskId]);

  const captureScreenshot = async () => {
    // This function should not return a boolean; it should return a string
    // (the screenshot URL) or null
    const result = await originalCaptureScreenshot();
    return result; // This should properly maintain the return type
  };

  // Ensure taskOutput is properly typed or converted to string for rendering
  const renderTaskOutput = () => {
    if (!taskOutput) return null;
    
    // If taskOutput is an array, convert it to string
    if (Array.isArray(taskOutput)) {
      return taskOutput.map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          // For objects, convert to string
          return <div key={index}>{JSON.stringify(item)}</div>;
        }
        return <div key={index}>{String(item)}</div>;
      });
    }
    
    // For any other type, convert to string
    return String(taskOutput);
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Worker AI</h1>
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
            <MessageCircle className="h-4 w-4" />
            <span>Chat Interface</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BrowserChatInterface
              taskInput={taskInput}
              setTaskInput={setTaskInput}
              onSubmit={startTask}
              isProcessing={isProcessing}
              taskStatus={taskStatus || ""}
              userCredits={userCredits ? userCredits.credits_remaining : null}
              taskOutput={renderTaskOutput()}
              error={error}
              onStop={stopTask}
              onPause={pauseTask}
              onResume={resumeTask}
              onRestart={restartTask}
              currentTaskId={currentTaskId}
            />

            <BrowserView
              liveUrl={liveUrl}
              currentUrl={currentUrl}
              setCurrentUrl={setCurrentUrl}
              screenshot={screenshot}
              captureScreenshot={originalCaptureScreenshot}
              connectionStatus={connectionStatus || "disconnected"}
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <BrowserTaskHistory onLoadTask={loadPreviousTask} />
        </TabsContent>

        <TabsContent value="settings">
          <BrowserConfigPanel
            config={browserConfig || {}}
            setConfig={(config) => {
              if (setBrowserConfig) {
                setBrowserConfig(config);
              }
            }}
            disabled={isProcessing && taskStatus !== 'completed' && taskStatus !== 'failed' && taskStatus !== 'stopped' && taskStatus !== 'expired'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
