
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
import { useBrowserAutomation } from "@/hooks/computer-use/use-browser-automation";
import { 
  Loader2, 
  Send, 
  Play, 
  RotateCcw, 
  Computer, 
  Info, 
  AlertCircle, 
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BrowserAutomationAgent() {
  const { 
    taskDescription, 
    setTaskDescription,
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
    screenshot,
    browserSessionConnected
  } = useBrowserAutomation();

  const [activeTab, setActiveTab] = useState("browser");
  
  // Take screenshot when needed
  const handleTakeScreenshot = useCallback(async () => {
    const result = await captureScreenshot();
    if (result) {
      toast.success("Screenshot requested");
    } else {
      toast.error("Failed to request screenshot");
    }
  }, [captureScreenshot]);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Computer className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl font-semibold">Browser Automation Agent</h1>
          <Badge variant="secondary" className="ml-2">
            Credits: {userCredits?.credits_remaining?.toFixed(2) || "0"}
          </Badge>
          {browserSessionConnected && (
            <Badge variant="success" className="bg-green-500 text-white">Connected</Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleTakeScreenshot}
            disabled={!browserSessionConnected}
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
                  <div className="flex gap-2">
                    <Button 
                      onClick={executeAction}
                      disabled={isProcessing || currentActions.length === 0 || !browserSessionConnected}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing</>
                      ) : (
                        <><Play className="h-4 w-4 mr-2" /> Execute Action</>
                      )}
                    </Button>
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
                    placeholder="Current URL (readonly)"
                    className="flex-1"
                    readOnly
                  />
                </div>
              )}
            </div>
            
            <TabsContent value="browser" className="flex-1 p-0 m-0 relative">
              {!browserSessionConnected && !screenshot && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 z-10">
                  <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow-lg max-w-md">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <h3 className="text-lg font-semibold mb-2">Browser Not Connected</h3>
                    <p className="mb-4">Start a new session to connect to the browser automation service.</p>
                    <Button onClick={startSession} disabled={isProcessing || !taskDescription}>
                      Start Session
                    </Button>
                  </div>
                </div>
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/30 dark:bg-gray-800/30 z-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              
              <div className="browser-view-container w-full h-full bg-white flex items-center justify-center">
                {screenshot ? (
                  <img 
                    src={screenshot} 
                    alt="Browser view" 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Computer className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-xl font-semibold mb-2">No Screenshot Available</h2>
                    <p className="text-gray-500 mb-4">Start a session to see browser automation in action.</p>
                  </div>
                )}
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
