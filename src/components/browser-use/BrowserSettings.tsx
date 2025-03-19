
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";
import { BrowserConfig, BrowserTheme } from "@/hooks/browser-use/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BrowserSettingsProps {
  browserConfig: BrowserConfig;
  updateConfig: (config: BrowserConfig) => void;
  isProcessing: boolean;
}

export function BrowserSettings({ browserConfig, updateConfig, isProcessing }: BrowserSettingsProps) {
  const [activeTab, setActiveTab] = useState("basic");
  
  const handleChange = <K extends keyof BrowserConfig>(key: K, value: BrowserConfig[K]) => {
    updateConfig({
      ...browserConfig,
      [key]: value
    });
  };
  
  const handleContextConfigChange = <K extends keyof BrowserConfig['contextConfig']>(
    key: K, 
    value: BrowserConfig['contextConfig'][K]
  ) => {
    updateConfig({
      ...browserConfig,
      contextConfig: {
        ...browserConfig.contextConfig,
        [key]: value
      }
    });
  };
  
  const themes: BrowserTheme[] = [
    "Default", "Soft", "Monochrome", "Glass", "Origin", "Citrus", "Ocean"
  ];
  
  const resolutions = [
    "1920x1080",
    "1600x900",
    "1366x768",
    "1280x720",
    "3840x2160",
    "2560x1440"
  ];
  
  return (
    <Card className="col-span-1">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">Browser Settings</CardTitle>
        <CardDescription>
          Configure how the browser behaves during the task
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="developer">Developer</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label className="block mb-2">Browser Theme</Label>
                <Select 
                  disabled={isProcessing}
                  value={browserConfig.theme} 
                  onValueChange={(value) => handleChange('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map(theme => (
                      <SelectItem key={theme} value={theme}>
                        {theme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block mb-2">Screen Resolution</Label>
                <Select 
                  disabled={isProcessing}
                  value={browserConfig.resolution} 
                  onValueChange={(value) => handleChange('resolution', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {resolutions.map(res => (
                      <SelectItem key={res} value={res}>
                        {res}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="darkMode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable dark mode for the browser
                  </p>
                </div>
                <Switch
                  id="darkMode"
                  disabled={isProcessing}
                  checked={browserConfig.darkMode}
                  onCheckedChange={(checked) => handleChange('darkMode', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="persistentSession">Persistent Session</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep browser state between sessions
                  </p>
                </div>
                <Switch
                  id="persistentSession"
                  disabled={isProcessing}
                  checked={browserConfig.persistentSession}
                  onCheckedChange={(checked) => handleChange('persistentSession', checked)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useOwnBrowser">Use Own Browser</Label>
                  <p className="text-sm text-muted-foreground">
                    Use your local Chrome browser
                  </p>
                </div>
                <Switch
                  id="useOwnBrowser"
                  disabled={isProcessing}
                  checked={browserConfig.useOwnBrowser}
                  onCheckedChange={(checked) => handleChange('useOwnBrowser', checked)}
                />
              </div>
              
              {browserConfig.useOwnBrowser && (
                <>
                  <div>
                    <Label htmlFor="chromePath" className="block mb-2">
                      Chrome Path
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 inline-block ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>Path to Chrome executable. Example:<br />
                              Windows: C:\Program Files\Google\Chrome\Application\chrome.exe<br />
                              Mac: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="chromePath"
                      disabled={isProcessing}
                      value={browserConfig.chromePath || ''}
                      onChange={(e) => handleChange('chromePath', e.target.value)}
                      placeholder="Path to Chrome executable"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="chromeUserData" className="block mb-2">
                      Chrome User Data Path
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 inline-block ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>Path to Chrome user data directory. Example:<br />
                              Windows: C:\Users\YourUsername\AppData\Local\Google\Chrome\User Data<br />
                              Mac: /Users/YourUsername/Library/Application Support/Google/Chrome
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="chromeUserData"
                      disabled={isProcessing}
                      value={browserConfig.chromeUserData || ''}
                      onChange={(e) => handleChange('chromeUserData', e.target.value)}
                      placeholder="Path to Chrome user data directory (optional)"
                    />
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="highlightElements">Highlight Elements</Label>
                  <p className="text-sm text-muted-foreground">
                    Highlight elements that AI interacts with
                  </p>
                </div>
                <Switch
                  id="highlightElements"
                  disabled={isProcessing}
                  checked={browserConfig.contextConfig.highlightElements}
                  onCheckedChange={(checked) => handleContextConfigChange('highlightElements', checked)}
                />
              </div>
              
              <Alert className="bg-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  When using your own browser, close all Chrome windows before starting a task.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
          
          <TabsContent value="developer" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="disableSecurity">Disable Security</Label>
                  <p className="text-sm text-muted-foreground">
                    Disable web security (CORS, SSL)
                  </p>
                </div>
                <Switch
                  id="disableSecurity"
                  disabled={isProcessing}
                  checked={browserConfig.disableSecurity}
                  onCheckedChange={(checked) => handleChange('disableSecurity', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="headless">Headless Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Run browser without visible UI
                  </p>
                </div>
                <Switch
                  id="headless"
                  disabled={isProcessing}
                  checked={browserConfig.headless}
                  onCheckedChange={(checked) => handleChange('headless', checked)}
                />
              </div>
              
              <Separator />
              
              <div>
                <Label htmlFor="minWaitPageLoadTime" className="block mb-2">
                  Min Page Load Time (seconds)
                </Label>
                <Input
                  id="minWaitPageLoadTime"
                  type="number"
                  min="0"
                  step="0.1"
                  disabled={isProcessing}
                  value={browserConfig.contextConfig.minWaitPageLoadTime}
                  onChange={(e) => handleContextConfigChange('minWaitPageLoadTime', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="waitForNetworkIdlePageLoadTime" className="block mb-2">
                  Network Idle Wait Time (seconds)
                </Label>
                <Input
                  id="waitForNetworkIdlePageLoadTime"
                  type="number"
                  min="0"
                  step="0.1"
                  disabled={isProcessing}
                  value={browserConfig.contextConfig.waitForNetworkIdlePageLoadTime}
                  onChange={(e) => handleContextConfigChange('waitForNetworkIdlePageLoadTime', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="maxWaitPageLoadTime" className="block mb-2">
                  Max Page Load Time (seconds)
                </Label>
                <Input
                  id="maxWaitPageLoadTime"
                  type="number"
                  min="0"
                  step="0.1"
                  disabled={isProcessing}
                  value={browserConfig.contextConfig.maxWaitPageLoadTime}
                  onChange={(e) => handleContextConfigChange('maxWaitPageLoadTime', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="viewportExpansion" className="block mb-2">
                  Viewport Expansion (pixels)
                </Label>
                <Input
                  id="viewportExpansion"
                  type="number"
                  min="0"
                  disabled={isProcessing}
                  value={browserConfig.contextConfig.viewportExpansion}
                  onChange={(e) => handleContextConfigChange('viewportExpansion', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="userAgent" className="block mb-2">
                  User Agent (optional)
                </Label>
                <Input
                  id="userAgent"
                  disabled={isProcessing}
                  value={browserConfig.contextConfig.userAgent || ''}
                  onChange={(e) => handleContextConfigChange('userAgent', e.target.value)}
                  placeholder="Custom user agent string"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
