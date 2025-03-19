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
  Lock,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    isEmbeddingBlocked,
    setIsEmbeddingBlocked,
    isLikelyToBlockIframe
  } = useManusAgent();

  const [activeTab, setActiveTab] = useState("browser");
  const browserViewRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [navigationAttempts, setNavigationAttempts] = useState<number>(0);
  const [externalWindowOpened, setExternalWindowOpened] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  useEffect(() => {
    if (activeTab === "browser" && browserViewRef.current) {
      try {
        if (!browserViewRef.current.src || browserViewRef.current.src === "about:blank") {
          console.log("Setting initial browser URL to Google");
          setIframeLoading(true);
          browserViewRef.current.src = "https://www.google.com";
          setCurrentUrl("https://www.google.com");
        }
      } catch (error) {
        console.error("Error initializing browser view:", error);
        setIframeError("Failed to initialize browser view. Please try refreshing the page.");
      }
    }
  }, [activeTab, setCurrentUrl]);
  
  useEffect(() => {
    if (currentUrl) {
      const blocksIframe = isLikelyToBlockIframe(currentUrl);
      if (blocksIframe && !isEmbeddingBlocked) {
        console.log(`URL ${currentUrl} is likely to block iframe embedding`);
        setIsEmbeddingBlocked(true);
      }
    }
  }, [currentUrl, isLikelyToBlockIframe, isEmbeddingBlocked, setIsEmbeddingBlocked]);
  
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
    setIframeError(null);
    setNavigationAttempts(0);
    
    if (browserViewRef.current) {
      try {
        const iframeWindow = browserViewRef.current.contentWindow;
        if (iframeWindow) {
          try {
            const iframeUrl = iframeWindow.location.href;
            const iframeTitle = iframeWindow.document.title;
            
            if (iframeUrl && iframeUrl !== "about:blank") {
              setCurrentUrl(iframeUrl);
              console.log("Iframe navigated to:", iframeUrl);
            }
            
            if (iframeTitle) {
              setPageTitle(iframeTitle);
              console.log("Page title:", iframeTitle);
              
              if (isEmbeddingBlocked) {
                setIsEmbeddingBlocked(false);
              }
            } else {
              try {
                const bodyContent = iframeWindow.document.body.innerHTML;
                if (!bodyContent || bodyContent.trim() === "") {
                  console.log("Empty document body detected - possible iframe blocking");
                  setIsEmbeddingBlocked(true);
                  setIframeError("This site appears to block embedding in iframes. You can open it in a new tab instead.");
                }
              } catch (e) {
                console.log("Cannot access document body - possible CORS/iframe restriction");
                setIsEmbeddingBlocked(true);
              }
            }
          } catch (e) {
            console.log("CORS error accessing iframe content:", e);
            if (debugMode) {
              toast.info("CORS restrictions detected - cannot access iframe content");
            }
          }
          
          setTimeout(captureScreenshot, 500);
        }
      } catch (e) {
        console.error("Error accessing iframe URL (this may be normal for cross-origin sites):", e);
        if (e instanceof DOMException && (e.name === "SecurityError" || e.name === "NotAllowedError")) {
          setIsEmbeddingBlocked(true);
          setIframeError("This site blocks iframe embedding due to security restrictions. You can open it in a new tab instead.");
        }
        setTimeout(captureScreenshot, 500);
      }
    }
  }, [setCurrentUrl, captureScreenshot, isEmbeddingBlocked, setIsEmbeddingBlocked, debugMode]);
  
  const handleIframeError = useCallback(() => {
    setIframeLoading(false);
    
    if (navigationAttempts < 2) {
      setNavigationAttempts(prev => prev + 1);
      console.log(`Retry attempt ${navigationAttempts + 1} for URL:`, currentUrl);
      
      if (browserViewRef.current && currentUrl) {
        setTimeout(() => {
          if (browserViewRef.current) {
            browserViewRef.current.src = currentUrl;
          }
        }, 1000);
      }
      return;
    }
    
    setIframeError("Failed to load the page. This may be due to security restrictions or the site blocking iframe embedding.");
    console.error("Iframe failed to load after retries:", currentUrl);
    
    setIsEmbeddingBlocked(true);
    setTimeout(captureScreenshot, 500);
  }, [currentUrl, captureScreenshot, navigationAttempts, setIsEmbeddingBlocked]);
  
  const navigateToUrl = useCallback((url: string) => {
    let navigateUrl = url.trim();
    
    if (!navigateUrl.includes(".") && !navigateUrl.startsWith("http")) {
      navigateUrl = `https://www.google.com/search?q=${encodeURIComponent(navigateUrl)}`;
    } else if (!/^https?:\/\//i.test(navigateUrl)) {
      navigateUrl = `https://${navigateUrl}`;
    }
    
    const likelyToBlock = isLikelyToBlockIframe(navigateUrl);
    
    if (likelyToBlock) {
      const userChoice = window.confirm(
        `${navigateUrl} is likely to block iframe embedding. \n\n` +
        `Click OK to open in a new tab, or Cancel to try in iframe anyway.`
      );
      
      if (userChoice) {
        window.open(navigateUrl, '_blank');
        setExternalWindowOpened(true);
        setCurrentUrl(navigateUrl);
        setIsEmbeddingBlocked(true);
        return;
      }
    }
    
    setIframeError(null);
    setIframeLoading(true);
    setNavigationAttempts(0);
    setIsEmbeddingBlocked(false);
    setExternalWindowOpened(false);
    
    if (browserViewRef.current) {
      browserViewRef.current.src = navigateUrl;
      setCurrentUrl(navigateUrl);
      console.log("Navigating iframe to:", navigateUrl);
    }
  }, [setCurrentUrl, setIsEmbeddingBlocked, isLikelyToBlockIframe]);
  
  const openInNewTab = useCallback(() => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
      setExternalWindowOpened(true);
      setIsEmbeddingBlocked(true);
      toast.success("Opened in new tab");
    }
  }, [currentUrl, setIsEmbeddingBlocked]);
  
  const handleTakeScreenshot = useCallback(async () => {
    const screenshot = await captureScreenshot();
    if (screenshot) {
      toast.success("Screenshot captured");
    } else {
      toast.error("Failed to capture screenshot");
    }
  }, [captureScreenshot]);
  
  useEffect(() => {
    if (currentActions.length > 0) {
      const currentAction = currentActions[0];
      
      if (currentAction.type === "navigate" && currentAction.url) {
        console.log("Executing navigate action:", currentAction.url);
        
        const likelyToBlock = isLikelyToBlockIframe(currentAction.url);
        
        if (likelyToBlock && !isEmbeddingBlocked) {
          toast.info(`${currentAction.url} likely blocks iframe embedding. Opening in new tab instead.`);
          window.open(currentAction.url, '_blank');
          setExternalWindowOpened(true);
          setCurrentUrl(currentAction.url);
          setIsEmbeddingBlocked(true);
          
          setTimeout(() => {
            executeAction();
          }, 500);
        } else {
          navigateToUrl(currentAction.url);
        }
      } else if (currentAction.type === "openNewTab" && currentAction.url) {
        console.log("Opening URL in new tab:", currentAction.url);
        window.open(currentAction.url, '_blank');
        setExternalWindowOpened(true);
        setCurrentUrl(currentAction.url);
        setIsEmbeddingBlocked(true);
        
        setTimeout(() => {
          executeAction();
        }, 500);
      }
    }
  }, [currentActions, navigateToUrl, executeAction, isLikelyToBlockIframe, isEmbeddingBlocked, setIsEmbeddingBlocked]);
  
  const handleRetryNavigation = useCallback(() => {
    if (currentUrl) {
      setIframeError(null);
      setIframeLoading(true);
      setNavigationAttempts(0);
      setIsEmbeddingBlocked(false);
      setExternalWindowOpened(false);
      
      if (browserViewRef.current) {
        browserViewRef.current.src = currentUrl;
        console.log("Retrying navigation to:", currentUrl);
      }
    }
  }, [currentUrl, setIsEmbeddingBlocked]);
  
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
            
            {isEmbeddingBlocked && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Iframe Embedding Blocked</AlertTitle>
                <AlertDescription>
                  {externalWindowOpened ? (
                    "This site was opened in a new tab. The agent will continue to analyze screenshots and help guide your interaction."
                  ) : (
                    "This site is blocking iframe embedding. The agent can analyze the screenshot, but interactive actions may not work. Consider opening in a new tab."
                  )}
                </AlertDescription>
                {!externalWindowOpened && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={openInNewTab}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                )}
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
                  <div className="flex gap-2">
                    <Button 
                      onClick={executeAction}
                      disabled={isProcessing || currentActions.length === 0}
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
                          if (currentActions[0].url) {
                            window.open(currentActions[0].url, '_blank');
                            setExternalWindowOpened(true);
                            setIsEmbeddingBlocked(true);
                            setTimeout(() => {
                              executeAction();
                            }, 500);
                          }
                        }}
                        title="Open in new tab instead"
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
                    onClick={handleRetryNavigation}
                    title="Reload page"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openInNewTab}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <TabsContent value="browser" className="flex-1 p-0 m-0 relative">
              {pageTitle && (
                <div className="absolute top-0 left-0 right-0 bg-gray-100 dark:bg-gray-800 px-4 py-1 text-xs text-gray-600 dark:text-gray-300 truncate z-10 border-b">
                  {pageTitle}
                </div>
              )}
              
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 z-10">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">Loading {currentUrl}...</p>
                  </div>
                </div>
              )}
              
              {iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 z-10">
                  <Alert variant="destructive" className="w-3/4 max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Navigation Error</AlertTitle>
                    <AlertDescription>
                      {iframeError}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRetryNavigation}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={openInNewTab}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in new tab
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTakeScreenshot}
                        >
                          Take Screenshot
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              {externalWindowOpened && !iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 z-10">
                  <Alert className="w-3/4 max-w-md">
                    <ExternalLink className="h-4 w-4" />
                    <AlertTitle>External Window</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">
                        The site has been opened in a new browser tab. Continue your task there, and then:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 mb-4">
                        <li>Take a screenshot here when you need the agent's help</li>
                        <li>The agent will analyze the screenshot and suggest next steps</li>
                        <li>Execute those steps in the external window</li>
                      </ol>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTakeScreenshot}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Take Screenshot Now
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              <div className="browser-view-container w-full h-full bg-white">
                <iframe 
                  ref={browserViewRef}
                  className="w-full h-full border-0"
                  title="Browser View"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation"
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
