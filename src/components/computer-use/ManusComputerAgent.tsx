
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
import { Loader2, Send, Play, RotateCcw, Computer, Info, AlertCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    error
  } = useManusAgent();

  const [activeTab, setActiveTab] = useState("browser");
  const browserViewRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  
  // Set up the browser environment
  useEffect(() => {
    if (activeTab === "browser" && browserViewRef.current) {
      // Set initial URL if not already set
      if (!browserViewRef.current.src || browserViewRef.current.src === "about:blank") {
        setIframeLoading(true);
        browserViewRef.current.src = "https://www.google.com";
        setCurrentUrl("https://www.google.com");
      }
    }
  }, [activeTab, setCurrentUrl]);
  
  // Handle iframe navigation
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
    setIframeError(null);
    
    if (browserViewRef.current) {
      try {
        // Try to get URL from iframe (may fail due to CORS)
        const iframeUrl = browserViewRef.current.contentWindow?.location.href;
        if (iframeUrl && iframeUrl !== "about:blank") {
          setCurrentUrl(iframeUrl);
          console.log("Iframe navigated to:", iframeUrl);
        }
      } catch (e) {
        console.error("Error accessing iframe URL (this may be normal for cross-origin sites):", e);
      }
    }
  }, [setCurrentUrl]);
  
  const handleIframeError = useCallback(() => {
    setIframeLoading(false);
    setIframeError("Failed to load the page. This may be due to security restrictions or the site blocking iframe embedding.");
    console.error("Iframe failed to load:", currentUrl);
  }, [currentUrl]);
  
  // Navigate to URL
  const navigateToUrl = useCallback((url: string) => {
    // Ensure URL has protocol
    let navigateUrl = url;
    if (!/^https?:\/\//i.test(navigateUrl)) {
      navigateUrl = `https://${navigateUrl}`;
    }
    
    if (browserViewRef.current) {
      setIframeLoading(true);
      setIframeError(null);
      browserViewRef.current.src = navigateUrl;
      setCurrentUrl(navigateUrl);
      console.log("Navigating iframe to:", navigateUrl);
    }
  }, [setCurrentUrl]);
  
  // Take screenshot when needed
  const handleTakeScreenshot = useCallback(async () => {
    await captureScreenshot();
    toast.success("Screenshot captured");
  }, [captureScreenshot]);

  // Handle action execution effect
  useEffect(() => {
    // Look for navigate actions and execute them directly
    if (currentActions.length > 0 && currentActions[0].type === "navigate" && currentActions[0].url) {
      console.log("Executing navigate action:", currentActions[0].url);
      navigateToUrl(currentActions[0].url);
    }
  }, [currentActions, navigateToUrl]);
  
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
            Take Screenshot
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearSession}
          >
            Reset
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
        {/* Left Panel: Task Configuration */}
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
              <h3 className="text-sm font-medium">Current Actions</h3>
              {currentActions.length > 0 ? (
                <div className="space-y-2">
                  {currentActions.map((action, index) => (
                    <Card key={index} className="p-2 text-sm">
                      <div className="font-medium">{formatAction(action)}</div>
                    </Card>
                  ))}
                  <Button 
                    onClick={executeAction}
                    disabled={isProcessing || currentActions.length === 0}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Execute Action</>
                    )}
                  </Button>
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
        
        {/* Middle and Right Panels: Browser View and Action History */}
        <div className="col-span-2 flex flex-col overflow-hidden">
          <Tabs defaultValue="browser" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-2 border-b">
              <TabsList className="w-full">
                <TabsTrigger value="browser" className="flex-1">Browser View</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">Action History</TabsTrigger>
              </TabsList>
              
              {activeTab === "browser" && (
                <div className="flex items-center gap-2 py-2">
                  <Input 
                    value={currentUrl || ""}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        navigateToUrl(currentUrl || "");
                      }
                    }}
                    placeholder="Enter URL"
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (browserViewRef.current && currentUrl) {
                        navigateToUrl(currentUrl);
                      }
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (currentUrl) {
                        window.open(currentUrl, '_blank');
                      }
                    }}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <TabsContent value="browser" className="flex-1 p-0 m-0 relative">
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              
              {iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 z-10">
                  <Alert variant="destructive" className="w-3/4 max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {iframeError}
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (currentUrl) {
                              window.open(currentUrl, '_blank');
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in new tab
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              <div className="browser-view-container w-full h-full bg-white">
                <iframe 
                  ref={browserViewRef}
                  className="w-full h-full border-0"
                  title="Browser View"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
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
    </div>
  );
}
