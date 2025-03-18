
import { useState, useRef, useEffect } from "react";
import { useComputerUseAgent } from "@/hooks/use-computer-use-agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Play, StopCircle, RefreshCw, Check, CameraIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import html2canvas from "html2canvas";

export function ComputerUseAgent() {
  const {
    taskDescription,
    setTaskDescription,
    environment,
    setEnvironment,
    sessionId,
    isProcessing,
    currentOutput,
    startSession,
    executeAction,
    clearSession,
    pendingSafetyChecks,
    acknowledgeAllSafetyChecks,
    currentUrl,
    setCurrentUrl,
    actionHistory,
    userCredits,
    setScreenshot
  } = useComputerUseAgent();

  const [activeTab, setActiveTab] = useState("input");
  const browserViewRef = useRef<HTMLDivElement>(null);
  
  // Function to capture screenshot of the browser view
  const captureScreenshot = async () => {
    if (browserViewRef.current && environment === "browser") {
      try {
        const canvas = await html2canvas(browserViewRef.current, {
          useCORS: true,
          allowTaint: true,
          logging: false
        });
        
        const dataUrl = canvas.toDataURL("image/png");
        setScreenshot(dataUrl);
        return dataUrl;
      } catch (error) {
        console.error("Error capturing screenshot:", error);
        // Fallback to a blank image
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      }
    }
    return null;
  };
  
  // Helper to check if an action can be executed
  const canExecuteAction = () => {
    if (isProcessing) return false;
    return currentOutput.some(item => item.type === "computer_call");
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

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-4">Computer Use Agent</h1>
      <p className="text-muted-foreground mb-6">
        Give instructions to our AI agent that can control a computer to perform tasks on your behalf.
      </p>
      
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
                  <CardTitle>Task Description</CardTitle>
                  <CardDescription>
                    Describe what you want the computer agent to do
                  </CardDescription>
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
                          <SelectItem value="mac">macOS</SelectItem>
                          <SelectItem value="windows">Windows</SelectItem>
                          <SelectItem value="ubuntu">Ubuntu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="current-url" className="text-sm font-medium">
                        Current URL (optional)
                      </label>
                      <Input 
                        id="current-url"
                        placeholder="https://example.com"
                        value={currentUrl || ""}
                        onChange={(e) => setCurrentUrl(e.target.value)}
                        disabled={isProcessing}
                      />
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
                      disabled={isProcessing || !taskDescription.trim()}
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
                  <ScrollArea className="h-[400px] pr-4">
                    {actionHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No actions have been performed yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {actionHistory.map((action, index) => (
                          <div key={action.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium capitalize">{action.action_type}</h4>
                              <span className="text-xs text-muted-foreground">
                                {new Date(action.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(action.action_details, null, 2)}
                            </pre>
                            {action.reasoning && (
                              <>
                                <Separator className="my-2" />
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Reasoning:</span>{" "}
                                  {typeof action.reasoning === 'string' ? 
                                    JSON.parse(action.reasoning)?.[0]?.summary?.[0]?.text || "No reasoning provided" :
                                    action.reasoning?.[0]?.summary?.[0]?.text || "No reasoning provided"
                                  }
                                </div>
                              </>
                            )}
                            {action.screenshot_url && (
                              <div className="mt-2">
                                <img 
                                  src={action.screenshot_url} 
                                  alt="Screenshot" 
                                  className="rounded border w-full h-auto mt-2" 
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
                <CardHeader>
                  <CardTitle>Browser View</CardTitle>
                  <CardDescription>
                    Simulated browser environment for the agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    ref={browserViewRef} 
                    className="border rounded-lg p-4 bg-white h-[400px] w-full overflow-auto"
                  >
                    {/* Simulated browser content */}
                    <div className="border-b pb-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="bg-gray-100 rounded-full p-1 px-3 text-sm text-center truncate">
                          {currentUrl || "about:blank"}
                        </div>
                      </div>
                      <div className="text-gray-500">
                        <CameraIcon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="py-4 text-center text-gray-500">
                      <p>This is a simulated browser view.</p>
                      <p>In a real implementation, this would be an embedded browser or web view.</p>
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
              <ScrollArea className="h-[400px] pr-4">
                {!sessionId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Start a session to see output from the agent
                  </div>
                ) : currentOutput.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentOutput.map((item, index) => {
                      if (item.type === "reasoning") {
                        return (
                          <div key={index} className="border rounded-lg p-4 bg-muted/30">
                            <h4 className="font-medium mb-2">Agent Reasoning</h4>
                            <div className="text-sm">
                              {item.summary?.[0]?.text || "No reasoning provided"}
                            </div>
                          </div>
                        );
                      } else if (item.type === "computer_call") {
                        return (
                          <div key={index} className="border rounded-lg p-4 bg-primary/10">
                            <h4 className="font-medium mb-2">Next Action</h4>
                            <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(item.action, null, 2)}
                            </pre>
                          </div>
                        );
                      } else if (item.type === "text") {
                        return (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="text-sm">{item.text}</div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <CardFooter>
              {pendingSafetyChecks.length > 0 && (
                <Alert variant="destructive" className="w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Safety Alert</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2">
                      {pendingSafetyChecks.map((check, i) => (
                        <div key={i} className="text-sm mb-2">{check.message}</div>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={acknowledgeAllSafetyChecks}
                    >
                      <Check className="mr-2 h-4 w-4" /> 
                      Acknowledge and Proceed
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
