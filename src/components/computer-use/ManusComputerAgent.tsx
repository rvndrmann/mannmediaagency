
import { useState, useRef, useEffect } from "react";
import { useManusAgent } from "@/hooks/computer-use/use-manus-agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Play, StopCircle, RefreshCw, CameraIcon, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Clipboard, LogIn, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-user";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ManusComputerAgent() {
  const {
    taskDescription,
    setTaskDescription,
    environment,
    setEnvironment,
    apiKey,
    setApiKey,
    sessionId,
    isProcessing,
    currentActions,
    startSession,
    executeAction,
    clearSession,
    currentUrl,
    setCurrentUrl,
    actionHistory,
    userCredits,
    captureScreenshot,
    screenshot,
    reasoning,
    error,
    formatAction
  } = useManusAgent();

  const { user, isLoading: isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState("input");
  const browserViewRef = useRef<HTMLDivElement>(null);
  const [browserWidth, setBrowserWidth] = useState(1024);
  const [browserHeight, setBrowserHeight] = useState(768);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  // Helper to check if an action can be executed
  const canExecuteAction = () => {
    if (isProcessing) return false;
    return currentActions.length > 0;
  };
  
  // Function to copy URL to clipboard
  const copyUrlToClipboard = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      toast.success("URL copied to clipboard");
    }
  };
  
  // Start session with screenshot
  const handleStartSession = async () => {
    // First capture a screenshot if in browser environment
    if (environment === "browser") {
      await captureScreenshot();
    }
    startSession();
  };
  
  // Execute action with screenshot
  const handleExecuteAction = async () => {
    // Capture screenshot before executing action
    if (environment === "browser") {
      await captureScreenshot();
    }
    executeAction();
  };

  // Check if we should switch to the browser tab when a session is active
  useEffect(() => {
    if (sessionId && environment === "browser" && activeTab !== "browser") {
      setActiveTab("browser");
    }
  }, [sessionId, environment, activeTab]);

  // Determine browser view dimensions based on available space
  useEffect(() => {
    if (browserViewRef.current) {
      const updateDimensions = () => {
        const container = browserViewRef.current?.parentElement;
        if (container) {
          const availableWidth = container.clientWidth - 40; // Account for padding
          const aspectRatio = 1920 / 1080;
          
          // Calculate height based on available width and aspect ratio
          const calculatedHeight = availableWidth / aspectRatio;
          
          setBrowserWidth(availableWidth);
          setBrowserHeight(calculatedHeight);
        }
      };
      
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      
      return () => {
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, [browserViewRef.current]);

  // Show auth alert if not logged in
  if (!isUserLoading && !user) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">OpenManus Computer Agent</h1>
        
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="mt-2">
            <p>You need to be signed in to use the OpenManus Computer Agent.</p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/auth/login">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-4">OpenManus Computer Agent</h1>
      <p className="text-muted-foreground mb-6">
        Give instructions to the OpenManus AI agent that can control a computer to perform tasks on your behalf.
      </p>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="history">Action History</TabsTrigger>
              <TabsTrigger value="browser">Browser View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="input" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Task Description</CardTitle>
                      <CardDescription>
                        Describe what you want the computer agent to do
                      </CardDescription>
                    </div>
                    
                    <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          API Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>OpenManus API Key</DialogTitle>
                          <DialogDescription>
                            Enter your OpenManus API key to use the service.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              You can get an API key from the <a href="https://openmanus.app" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenManus website</a>.
                            </p>
                            <Input
                              type="password"
                              placeholder="Enter your OpenManus API key"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                          </div>
                          <Button onClick={() => setShowApiKeyDialog(false)} className="w-full">
                            Save API Key
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="E.g., Go to bing.com and search for vacation destinations in Europe"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={5}
                    disabled={!!sessionId || isProcessing}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="environment" className="text-sm font-medium">
                        Environment
                      </label>
                      <Select 
                        value={environment} 
                        onValueChange={(val: any) => setEnvironment(val)}
                        disabled={!!sessionId || isProcessing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="browser">Browser</SelectItem>
                          <SelectItem value="desktop">Desktop</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="current-url" className="text-sm font-medium">
                        Current URL (optional)
                      </label>
                      <div className="flex gap-2">
                        <Input 
                          id="current-url"
                          placeholder="https://example.com"
                          value={currentUrl || ""}
                          onChange={(e) => setCurrentUrl(e.target.value)}
                          disabled={isProcessing}
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={copyUrlToClipboard}
                          disabled={!currentUrl}
                        >
                          <Clipboard className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Credits available: {userCredits?.credits_remaining.toFixed(2) || 0}
                  </div>
                  
                  {!sessionId ? (
                    <Button 
                      onClick={handleStartSession} 
                      disabled={isProcessing || !taskDescription.trim() || (userCredits?.credits_remaining || 0) < 1 || !apiKey}
                    >
                      {isProcessing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      Start Session
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button 
                        variant="destructive" 
                        onClick={clearSession} 
                        disabled={isProcessing}
                      >
                        <StopCircle className="mr-2 h-4 w-4" />
                        End Session
                      </Button>
                      
                      <Button 
                        onClick={handleExecuteAction} 
                        disabled={!canExecuteAction()}
                      >
                        {isProcessing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Execute Next Action
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Action History</CardTitle>
                  <CardDescription>
                    History of actions performed in this session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {actionHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No actions have been performed yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {actionHistory.map((action, index) => (
                          <div key={action.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <h4 className="font-medium capitalize">{action.action.type}</h4>
                                <Badge variant={
                                  action.status === 'executed' ? 'success' : 
                                  action.status === 'pending' ? 'warning' : 'default'
                                } className="ml-2">
                                  {action.status}
                                </Badge>
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(action.timestamp || action.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            
                            <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-[200px]">
                              {JSON.stringify(action.action, null, 2)}
                            </pre>
                            
                            {action.reasoning && (
                              <>
                                <Separator className="my-2" />
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Reasoning:</span>{" "}
                                  {action.reasoning}
                                </div>
                              </>
                            )}
                            
                            {action.screenshot && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Result Screenshot:</p>
                                <img 
                                  src={action.screenshot} 
                                  alt="Screenshot" 
                                  className="rounded border w-full h-auto mt-2 object-contain" 
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="browser">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Browser View</CardTitle>
                      <CardDescription>
                        Simulated browser environment for the agent
                      </CardDescription>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Resolution: {browserWidth.toFixed(0)} × {browserHeight.toFixed(0)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="browser-view-container border rounded-lg bg-white overflow-hidden">
                    {/* Browser chrome */}
                    <div className="border-b bg-gray-100 p-2 flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-500">
                        <ArrowLeft className="h-4 w-4" />
                        <ArrowRight className="h-4 w-4" />
                        <RotateCw className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 px-2">
                        <div className="bg-white rounded-full border px-3 py-1 text-sm flex items-center">
                          <span className="truncate">{currentUrl || "about:blank"}</span>
                          {currentUrl && (
                            <Button variant="ghost" size="icon" className="ml-1 h-5 w-5" onClick={copyUrlToClipboard}>
                              <Clipboard className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Browser content */}
                    <div 
                      ref={browserViewRef} 
                      className="overflow-auto p-0"
                      style={{ 
                        height: `${browserHeight}px`, 
                        width: `${browserWidth}px`,
                        maxWidth: '100%',
                        position: 'relative'
                      }}
                    >
                      {!screenshot ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                          <p className="mb-2">This is a simulated browser view.</p>
                          <p>In a real implementation, this would be an embedded browser or web view.</p>
                        </div>
                      ) : (
                        <div className="relative">
                          <img 
                            src={screenshot} 
                            alt="Current browser view" 
                            className="w-full h-auto"
                          />
                          
                          {/* Overlay for showing pending actions */}
                          {isProcessing && (
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                              <div className="bg-white p-4 rounded shadow-lg">
                                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                <p className="text-sm">Processing action...</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Visualize computer action (click, type, etc) */}
                          {currentActions.length > 0 && (
                            <ActionVisualizer 
                              action={currentActions[0]} 
                              containerWidth={browserWidth}
                              containerHeight={browserHeight}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <Button onClick={captureScreenshot} disabled={isProcessing}>
                      <CameraIcon className="mr-2 h-4 w-4" />
                      Capture Screenshot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Agent Output</CardTitle>
              <CardDescription>
                Actions and reasoning from the AI agent
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ScrollArea className="h-[500px] pr-4">
                {!sessionId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Start a session to see output from the agent
                  </div>
                ) : isProcessing ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reasoning && (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-medium mb-2">Agent Reasoning</h4>
                        <div className="text-sm">
                          {reasoning}
                        </div>
                      </div>
                    )}
                    
                    {currentActions.map((action, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-primary/10">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{index === 0 ? "Next Action" : "Queued Action"}: {action.type}</h4>
                          <Badge variant="outline">{index === 0 ? "Ready" : `Queue position: ${index + 1}`}</Badge>
                        </div>
                        <div className="text-sm mb-2">
                          {formatAction(action)}
                        </div>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-[200px]">
                          {JSON.stringify(action, null, 2)}
                        </pre>
                      </div>
                    ))}
                    
                    {currentActions.length === 0 && sessionId && !isProcessing && (
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-center">
                          No more actions to execute. Task might be complete.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <CardFooter>
              {!apiKey && (
                <Alert variant="warning" className="w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>API Key Required</AlertTitle>
                  <AlertDescription>
                    <p className="mt-2">You need to provide an OpenManus API key to use this agent.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowApiKeyDialog(true)}
                    >
                      <Settings className="mr-2 h-4 w-4" /> 
                      Set API Key
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Component to visualize computer actions
function ActionVisualizer({ action, containerWidth, containerHeight }) {
  if (!action) return null;
  
  // For click actions, show a cursor
  if (action.type === 'click' && typeof action.x === 'number' && typeof action.y === 'number') {
    return (
      <div 
        className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ 
          left: `${action.x}px`, 
          top: `${action.y}px`,
          zIndex: 100
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="rgba(255,255,255,0.8)" stroke="black" strokeWidth="1.5"/>
        </svg>
        <div className="absolute left-full ml-2 top-0 bg-black text-white text-xs p-1 rounded whitespace-nowrap">
          Click ({action.x}, {action.y})
        </div>
      </div>
    );
  }
  
  // For type actions, show a text input
  if (action.type === 'type' && action.text) {
    return (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
        <span className="font-mono">Typing: {action.text}</span>
      </div>
    );
  }
  
  // For navigate actions, show a URL indicator
  if (action.type === 'navigate' && action.url) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
        <span className="font-mono">Navigating to: {action.url}</span>
      </div>
    );
  }
  
  // For press actions, show key combinations
  if (action.type === 'press' && action.keys?.length) {
    return (
      <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
        <span className="font-mono">
          Pressing: {action.keys.map(key => 
            <span key={key} className="mx-1 px-2 py-1 bg-gray-700 rounded">{key}</span>
          )}
        </span>
      </div>
    );
  }
  
  return null;
}
