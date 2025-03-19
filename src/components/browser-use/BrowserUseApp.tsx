
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserUseTask } from "@/hooks/browser-use/use-browser-use-task";
import { Loader2, Send, Play, Pause, RotateCcw, Computer, Info, AlertCircle, ExternalLink, RefreshCw, Eye, Globe, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TaskControls } from "./TaskControls";
import { TaskProgress } from "./TaskProgress";
import { TaskOutput } from "./TaskOutput";
import { BrowserSettings } from "./BrowserSettings";
import { BrowserConfig } from "@/hooks/browser-use/types";
import { normalizeUrl, openUrlInNewTab, canOpenNewTabs, isValidUrl } from "@/utils/url-utils";

export function BrowserUseApp() {
  const { 
    taskInput, 
    setTaskInput,
    currentTaskId,
    isProcessing,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    progress,
    taskSteps,
    taskOutput,
    taskStatus,
    currentUrl,
    setCurrentUrl,
    captureScreenshot,
    screenshot,
    userCredits,
    error,
    browserConfig,
    setBrowserConfig
  } = useBrowserUseTask();
  
  const [activeTab, setActiveTab] = useState("browser");
  const [browserSupportsPopups, setBrowserSupportsPopups] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    setBrowserSupportsPopups(canOpenNewTabs());
  }, []);
  
  const handleBrowseUrl = useCallback((url: string) => {
    if (!url || url.trim() === '') {
      toast.error("Please enter a valid URL");
      return;
    }
    
    if (!isValidUrl(url)) {
      toast.error("Please enter a valid URL");
      return;
    }
    
    let navigateUrl = normalizeUrl(url);
    const opened = openUrlInNewTab(navigateUrl);
    
    if (opened) {
      toast.success("URL opened in a new tab");
      setTimeout(() => {
        captureScreenshot();
      }, 2000);
    } else {
      toast.error("Failed to open URL. Please check your popup blocker settings.");
    }
  }, [captureScreenshot]);
  
  const handleTakeScreenshot = useCallback(async () => {
    if (!currentUrl) {
      toast.error("Please enter a URL first");
      return;
    }
    
    if (!isValidUrl(currentUrl)) {
      toast.error("Please enter a valid URL");
      return;
    }
    
    toast.info("Capturing screenshot...");
    const success = await captureScreenshot();
    
    if (success) {
      toast.success("Screenshot captured");
    } else {
      toast.error("Failed to capture screenshot");
    }
  }, [captureScreenshot, currentUrl]);

  const getThemeClass = useCallback(() => {
    if (!browserConfig.theme || browserConfig.theme === 'Default') return '';
    
    switch (browserConfig.theme) {
      case 'Soft':
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200';
      case 'Monochrome':
        return 'bg-gray-100 dark:bg-gray-900 grayscale';
      case 'Glass':
        return 'bg-white/80 dark:bg-black/80 backdrop-blur-md';
      case 'Origin':
        return 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100';
      case 'Citrus':
        return 'bg-lime-50 dark:bg-lime-950 text-lime-900 dark:text-lime-100';
      case 'Ocean':
        return 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100';
      default:
        return '';
    }
  }, [browserConfig.theme]);
  
  return (
    <div className={`flex flex-col h-[calc(100vh-5rem)] max-w-[1400px] mx-auto ${browserConfig.darkMode ? 'dark' : ''} ${getThemeClass()}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Computer className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl font-semibold">Browser Use API</h1>
          <Badge variant="secondary" className="ml-2">
            Credits: {userCredits?.credits_remaining?.toFixed(2) || "0"}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleTakeScreenshot}
          >
            <Eye className="h-4 w-4 mr-2" />
            Take Screenshot
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={stopTask}
            disabled={!currentTaskId || taskStatus === 'stopped'}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto border-r">
          <div className="space-y-4">
            {showSettings ? (
              <BrowserSettings 
                config={browserConfig}
                onConfigChange={setBrowserConfig}
              />
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Task Description</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe what you want the browser to do..."
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      disabled={isProcessing || taskStatus === 'running'}
                      className="flex-1"
                    />
                    <Button 
                      onClick={startTask}
                      disabled={isProcessing || !taskInput || taskStatus === 'running' || !userCredits || userCredits.credits_remaining < 1}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {!browserSupportsPopups && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Popup Blocker Detected</AlertTitle>
                    <AlertDescription>
                      Please allow popups for this site to enable the browser automation features.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Browse Web</h3>
                    {currentUrl && (
                      <Badge variant="outline" className="text-xs">
                        Current: {currentUrl.length > 25 ? currentUrl.substring(0, 25) + '...' : currentUrl}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={currentUrl || ""}
                      onChange={(e) => setCurrentUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleBrowseUrl(currentUrl || "");
                        }
                      }}
                      placeholder="Enter URL"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleBrowseUrl(currentUrl || "")}
                      title="Open in browser"
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {currentTaskId && (
                  <TaskControls 
                    taskStatus={taskStatus}
                    pauseTask={pauseTask}
                    resumeTask={resumeTask}
                    stopTask={stopTask}
                    isProcessing={isProcessing}
                  />
                )}
                
                {progress > 0 && (
                  <TaskProgress 
                    progress={progress}
                    taskStatus={taskStatus}
                  />
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="col-span-2 flex flex-col overflow-hidden">
          <Tabs defaultValue="browser" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-2 border-b">
              <TabsList className="w-full">
                <TabsTrigger value="browser" className="flex-1">Browser Preview</TabsTrigger>
                <TabsTrigger value="steps" className="flex-1">Task Steps</TabsTrigger>
                <TabsTrigger value="output" className="flex-1">Task Output</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="browser" className="flex-1 p-0 m-0 relative overflow-auto">
              <div className="p-8 flex flex-col items-center justify-center h-full browser-view-container">
                {screenshot ? (
                  <div className="relative">
                    <img 
                      src={screenshot} 
                      alt="Browser Screenshot" 
                      className="w-full max-w-4xl border rounded-md shadow-sm" 
                    />
                    <div className="absolute top-2 right-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-white/80 hover:bg-white" 
                        onClick={handleTakeScreenshot}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center max-w-lg">
                    <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Browser Use API</h2>
                    <p className="text-gray-500 mb-4">
                      Enter a task description or URL to begin browser automation.
                    </p>
                    <div className="flex w-full mb-4">
                      <Input
                        placeholder="Enter website URL (e.g., google.com)"
                        className="flex-1 mr-2"
                        value={currentUrl || ""}
                        onChange={(e) => setCurrentUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleBrowseUrl(currentUrl || "");
                          }
                        }}
                      />
                      <Button onClick={() => handleBrowseUrl(currentUrl || "")}>
                        <Globe className="h-4 w-4 mr-2" />
                        Browse
                      </Button>
                    </div>
                    
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>How It Works</AlertTitle>
                      <AlertDescription className="text-left text-sm">
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Describe a browsing task in the input field</li>
                          <li>Our AI will perform the task step-by-step</li>
                          <li>View real-time progress and screenshots</li>
                          <li>Control the task execution with pause/resume/stop</li>
                          <li>Get structured output of completed tasks</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="steps" className="flex-1 p-4 m-0 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                {taskSteps.length > 0 ? (
                  <div className="space-y-6">
                    {taskSteps.map((step, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge variant={step.status === "completed" ? "default" : (step.status === "failed" ? "destructive" : "secondary")}>
                            {step.status}
                          </Badge>
                          <div className="text-sm font-medium">{step.description}</div>
                        </div>
                        
                        {step.details && (
                          <Card className="p-3 text-sm bg-gray-100 dark:bg-gray-800">
                            {step.details}
                          </Card>
                        )}
                        
                        {step.screenshot && (
                          <img 
                            src={step.screenshot} 
                            alt="Step Screenshot" 
                            className="w-full rounded-md border shadow-sm" 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Info className="h-8 w-8 mx-auto mb-2" />
                      <p>No task steps yet.</p>
                      <p className="text-sm">Start a task to see step-by-step progress.</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="output" className="flex-1 p-4 m-0 overflow-hidden">
              <TaskOutput 
                taskOutput={taskOutput}
                taskStatus={taskStatus}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
