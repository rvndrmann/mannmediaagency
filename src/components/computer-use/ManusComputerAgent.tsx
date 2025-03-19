
import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useManusAgent } from "@/hooks/computer-use/use-manus-agent";
import { 
  Loader2, 
  Send, 
  Play, 
  RotateCcw, 
  Computer, 
  Info, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  Eye,
  Globe
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBrowserSession } from "@/hooks/computer-use/use-browser-session";
import { normalizeUrl } from "@/utils/url-utils";

export function ManusComputerAgent() {
  const { 
    taskDescription, 
    setTaskDescription,
    environment,
    setEnvironment,
    isProcessing,
    startSession,
    executeAction,
    clearSession,
    currentActions,
    reasoning,
    actionHistory,
    userCredits,
    formatAction,
    captureScreenshot,
    currentUrl,
    setCurrentUrl,
    error,
  } = useManusAgent();

  const {
    externalWindowOpened,
    setExternalWindowOpened,
    hasRecentlyOpened,
    markAsOpened
  } = useBrowserSession();
  
  const [activeTab, setActiveTab] = useState("browser");
  const [debugMode, setDebugMode] = useState(false);
  // Track if an action is currently being processed
  const isProcessingAction = useRef<boolean>(false);
  
  // Open URL in new tab with deduplication
  const openInNewTab = useCallback((url: string) => {
    // Skip if URL was recently opened to prevent duplicates
    if (hasRecentlyOpened(url)) {
      console.log(`Skipping duplicate tab open for: ${url}`);
      return;
    }
    
    console.log(`Opening URL in new tab: ${url}`);
    
    // Add to recently opened set
    markAsOpened(url);
    
    window.open(url, '_blank');
    setExternalWindowOpened(true);
    setCurrentUrl(url);
    
    // Show feedback to user
    toast.success("Opened in new tab");
  }, [setCurrentUrl, hasRecentlyOpened, markAsOpened, setExternalWindowOpened]);
  
  const handleBrowseUrl = useCallback((url: string) => {
    let navigateUrl = normalizeUrl(url);
    
    // Open in new tab
    openInNewTab(navigateUrl);
    
    // Capture screenshot after delay to allow user to switch back
    setTimeout(() => {
      captureScreenshot();
    }, 2000);
  }, [openInNewTab, captureScreenshot]);
  
  // Handle screenshot capture
  const handleTakeScreenshot = useCallback(async () => {
    const screenshot = await captureScreenshot();
    if (screenshot) {
      toast.success("Screenshot captured");
    } else {
      toast.error("Failed to capture screenshot");
    }
  }, [captureScreenshot]);
  
  useEffect(() => {
    if (currentActions.length > 0 && !isProcessingAction.current) {
      const currentAction = currentActions[0];
      
      // Set processing flag to prevent multiple tab opens
      isProcessingAction.current = true;
      
      if ((currentAction.type === "navigate" || currentAction.type === "openNewTab") && currentAction.url) {
        console.log(`Executing ${currentAction.type} action:`, currentAction.url);
        
        handleBrowseUrl(currentAction.url);
        
        // Short delay before executing the action to ensure state is updated
        setTimeout(() => {
          executeAction();
          isProcessingAction.current = false;
        }, 1000);
      } else {
        isProcessingAction.current = false;
      }
    }
  }, [
    currentActions, 
    executeAction,
    handleBrowseUrl
  ]);
  
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Computer className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl font-semibold">Computer Automation Agent</h1>
          <Badge variant="secondary" className="ml-2">
            Credits: {userCredits?.credits_remaining?.toFixed(2) || "0"}
          </Badge>
        </div>
        
        <div className="flex gap-2">
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
            onClick={clearSession}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto border-r">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Task Description</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Describe what you want the agent to do..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button 
                  onClick={startSession}
                  disabled={isProcessing || !taskDescription || !userCredits || userCredits.credits_remaining < 1}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Environment</label>
              <Select 
                value={environment} 
                onValueChange={(value) => setEnvironment(value as "browser" | "desktop" | "custom")}
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Web Browser</SelectItem>
                  <SelectItem value="desktop">Desktop (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
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
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Current Actions</h3>
              {currentActions.length > 0 ? (
                <div className="space-y-2">
                  {currentActions.map((action, index) => (
                    <Card key={index} className="p-2 text-sm">
                      <div className="font-medium">{formatAction(action)}</div>
                    </Card>
                  ))}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        if (!isProcessingAction.current) {
                          executeAction();
                        }
                      }}
                      disabled={isProcessing || currentActions.length === 0 || isProcessingAction.current}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing</>
                      ) : (
                        <><Play className="h-4 w-4 mr-2" /> Execute Action</>
                      )}
                    </Button>
                    
                    {currentActions.length > 0 && currentActions[0].type === "navigate" && currentActions[0].url && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (currentActions[0].url && !isProcessingAction.current) {
                            isProcessingAction.current = true;
                            openInNewTab(currentActions[0].url || "");
                            setTimeout(() => {
                              executeAction();
                              isProcessingAction.current = false;
                            }, 1000);
                          }
                        }}
                        disabled={isProcessingAction.current}
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No actions to perform. Start a new task to generate actions.
                </div>
              )}
            </div>
            
            {reasoning && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Agent Reasoning</h3>
                <Card className="p-3 text-sm bg-gray-100 dark:bg-gray-800">
                  {reasoning}
                </Card>
              </div>
            )}
          </div>
        </div>
        
        <div className="col-span-2 flex flex-col overflow-hidden">
          <Tabs defaultValue="browser" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-2 border-b">
              <TabsList className="w-full">
                <TabsTrigger value="browser" className="flex-1">Browser Overview</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">Action History</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="browser" className="flex-1 p-0 m-0 relative overflow-auto">
              <div className="p-8 flex flex-col items-center justify-center h-full">
                <div className="text-center max-w-lg">
                  <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Web Browser Mode</h2>
                  
                  {externalWindowOpened ? (
                    <>
                      <p className="text-gray-500 mb-4">
                        A website is currently open in a separate browser tab. Continue your task there, then come back here when you need the agent's help.
                      </p>
                      <div className="flex flex-col space-y-3">
                        <Button onClick={handleTakeScreenshot}>
                          <Eye className="h-4 w-4 mr-2" />
                          Take Screenshot Now
                        </Button>
                        {currentUrl && (
                          <Button variant="outline" onClick={() => handleBrowseUrl(currentUrl)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Reopen Current URL
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 mb-4">
                        Enter a URL in the input field on the left or use the box below to quickly visit a website.
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
                    </>
                  )}
                    
                  <Alert className="mt-6">
                    <Info className="h-4 w-4" />
                    <AlertTitle>How It Works</AlertTitle>
                    <AlertDescription className="text-left text-sm">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>The agent will open websites in new browser tabs</li>
                        <li>Complete your browsing tasks in those tabs</li>
                        <li>Return here and click "Take Screenshot" when you need help</li>
                        <li>The agent will analyze your screenshot and suggest next steps</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 p-4 m-0 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                {actionHistory.length > 0 ? (
                  <div className="space-y-6">
                    {actionHistory.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge variant={item.status === "executed" ? "default" : (item.status === "failed" ? "destructive" : "secondary")}>
                            {item.status}
                          </Badge>
                          <div className="text-sm font-medium">{formatAction(item.action)}</div>
                        </div>
                        
                        {item.reasoning && (
                          <Card className="p-3 text-sm bg-gray-100 dark:bg-gray-800">
                            {item.reasoning}
                          </Card>
                        )}
                        
                        {item.screenshot && (
                          <img 
                            src={item.screenshot} 
                            alt="Screenshot" 
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
                      <p>No action history yet.</p>
                      <p className="text-sm">Actions will appear here as you execute them.</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <div className="p-2 border-t text-right">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDebugMode(!debugMode)}
          className="text-xs"
        >
          {debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
        </Button>
      </div>
    </div>
  );
}
