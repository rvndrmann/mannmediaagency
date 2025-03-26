import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrowserConfig, DesktopApplication } from "@/hooks/browser-use/types";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Laptop, Plus, Trash2, Bookmark, Terminal, Globe, Database, FileCode } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoCircledIcon } from "@radix-ui/react-icons";

interface BrowserConfigPanelProps {
  config: BrowserConfig;
  setConfig: (config: BrowserConfig) => void;
  disabled?: boolean;
  environment?: 'browser' | 'desktop';
  setEnvironment?: (environment: 'browser' | 'desktop') => void;
}

export function BrowserConfigPanel({ 
  config, 
  setConfig, 
  disabled = false,
  environment,
  setEnvironment
}: BrowserConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [newApp, setNewApp] = useState<DesktopApplication>({ name: "", path: "" });
  const [connectionMethod, setConnectionMethod] = useState<string>(
    config.wssUrl ? "wss" : 
    config.cdpUrl ? "cdp" : 
    config.browserInstancePath ? "binary" : 
    config.chromePath ? "local" : "default"
  );

  const handleToggle = (property: keyof BrowserConfig) => {
    setConfig({
      ...config,
      [property]: !config[property as keyof BrowserConfig]
    });
  };

  const handleInputChange = (property: keyof BrowserConfig, value: string) => {
    setConfig({
      ...config,
      [property]: value
    });
  };

  const handleConnectionMethodChange = (method: string) => {
    setConnectionMethod(method);
    
    // Reset all connection-related properties
    const updatedConfig = {
      ...config,
      wssUrl: undefined,
      cdpUrl: undefined,
      browserInstancePath: undefined,
      chromePath: method === "local" ? config.chromePath : ""
    };
    
    setConfig(updatedConfig);
  };

  const handleConnectionUrlChange = (value: string) => {
    switch (connectionMethod) {
      case "wss":
        setConfig({
          ...config,
          wssUrl: value,
          cdpUrl: undefined,
          browserInstancePath: undefined
        });
        break;
      case "cdp":
        setConfig({
          ...config,
          cdpUrl: value,
          wssUrl: undefined,
          browserInstancePath: undefined
        });
        break;
      case "binary":
        setConfig({
          ...config,
          browserInstancePath: value,
          wssUrl: undefined,
          cdpUrl: undefined
        });
        break;
      case "local":
        setConfig({
          ...config,
          chromePath: value,
          wssUrl: undefined,
          cdpUrl: undefined,
          browserInstancePath: undefined
        });
        break;
    }
  };

  const handleDesktopAppsChange = (apps: DesktopApplication[]) => {
    setConfig({
      ...config,
      desktopApps: apps
    });
  };

  const addDesktopApp = () => {
    if (!newApp.name || !newApp.path) return;
    
    const updatedApps = [...(config.desktopApps || []), newApp];
    handleDesktopAppsChange(updatedApps);
    setNewApp({ name: "", path: "" });
  };

  const removeDesktopApp = (index: number) => {
    const updatedApps = [...(config.desktopApps || [])];
    updatedApps.splice(index, 1);
    handleDesktopAppsChange(updatedApps);
  };

  const handleTaskTemplateChange = (templates: string[]) => {
    setConfig({
      ...config,
      taskTemplates: templates
    });
  };

  const [newTemplate, setNewTemplate] = useState("");
  
  const addTaskTemplate = () => {
    if (!newTemplate.trim()) return;
    const updatedTemplates = [...(config.taskTemplates || []), newTemplate.trim()];
    handleTaskTemplateChange(updatedTemplates);
    setNewTemplate("");
  };

  const removeTaskTemplate = (index: number) => {
    const updatedTemplates = [...(config.taskTemplates || [])];
    updatedTemplates.splice(index, 1);
    handleTaskTemplateChange(updatedTemplates);
  };

  const handleContextConfigChange = (property: string, value: any) => {
    setConfig({
      ...config,
      contextConfig: {
        ...(config.contextConfig || {}),
        [property]: value
      }
    });
  };

  const getConnectionFieldLabel = () => {
    switch (connectionMethod) {
      case "wss":
        return "WebSocket URL (WSS)";
      case "cdp":
        return "Chrome DevTools Protocol URL";
      case "binary":
        return "Browser Instance Path";
      case "local":
        return "Chrome Executable Path";
      default:
        return "Connection URL";
    }
  };

  const getConnectionFieldPlaceholder = () => {
    switch (connectionMethod) {
      case "wss":
        return "wss://your-browser-provider.com/ws";
      case "cdp":
        return "http://localhost:9222";
      case "binary":
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      case "local":
        return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
      default:
        return "";
    }
  };

  const getConnectionValue = () => {
    switch (connectionMethod) {
      case "wss":
        return config.wssUrl || "";
      case "cdp":
        return config.cdpUrl || "";
      case "binary":
        return config.browserInstancePath || "";
      case "local":
        return config.chromePath || "";
      default:
        return "";
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-4">Browser & Desktop Configuration</h3>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="desktop">Desktop Settings</TabsTrigger>
          <TabsTrigger value="templates">Task Templates</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Core Settings</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="headless" className="text-sm">Headless Mode</Label>
                <p className="text-xs text-muted-foreground">Run browser without visible UI</p>
              </div>
              <Switch 
                id="headless"
                checked={config.headless} 
                onCheckedChange={() => handleToggle('headless')}
                disabled={disabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="disableSecurity" className="text-sm">Disable Security</Label>
                <p className="text-xs text-muted-foreground">Turn off web security features</p>
              </div>
              <Switch 
                id="disableSecurity"
                checked={config.disableSecurity} 
                onCheckedChange={() => handleToggle('disableSecurity')}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="persistentSession" className="text-sm">Persistent Session</Label>
                <p className="text-xs text-muted-foreground">Maintain cookies and local storage between sessions</p>
              </div>
              <Switch 
                id="persistentSession"
                checked={config.persistentSession} 
                onCheckedChange={() => handleToggle('persistentSession')}
                disabled={disabled}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Display Settings</h4>
            
            <div className="space-y-2">
              <Label htmlFor="resolution" className="text-sm">Resolution</Label>
              <Select
                value={config.resolution}
                onValueChange={(value) => handleInputChange('resolution', value)}
                disabled={disabled}
              >
                <SelectTrigger id="resolution">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1366x768">1366x768 (Laptop)</SelectItem>
                  <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                  <SelectItem value="2560x1440">2560x1440 (QHD)</SelectItem>
                  <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                  <SelectItem value="375x812">375x812 (iPhone X)</SelectItem>
                  <SelectItem value="414x896">414x896 (iPhone XR/XS Max)</SelectItem>
                  <SelectItem value="360x800">360x800 (Android)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="darkMode" className="text-sm">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Enable dark theme preference</p>
              </div>
              <Switch 
                id="darkMode"
                checked={config.darkMode} 
                onCheckedChange={() => handleToggle('darkMode')}
                disabled={disabled}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="connection" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">Browser Connection Method</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoCircledIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Choose how to connect to the browser. Default uses the cloud service, while other options allow connecting to external or local browsers.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={connectionMethod === "default" ? "default" : "outline"}
                className="flex flex-col items-center p-3 h-auto gap-2"
                onClick={() => handleConnectionMethodChange("default")}
                disabled={disabled}
              >
                <Globe className="h-5 w-5" />
                <span className="text-xs font-medium">Default Cloud</span>
              </Button>

              <Button
                type="button"
                variant={connectionMethod === "wss" ? "default" : "outline"}
                className="flex flex-col items-center p-3 h-auto gap-2"
                onClick={() => handleConnectionMethodChange("wss")}
                disabled={disabled}
              >
                <Database className="h-5 w-5" />
                <span className="text-xs font-medium">WebSocket (WSS)</span>
              </Button>

              <Button
                type="button"
                variant={connectionMethod === "cdp" ? "default" : "outline"}
                className="flex flex-col items-center p-3 h-auto gap-2"
                onClick={() => handleConnectionMethodChange("cdp")}
                disabled={disabled}
              >
                <FileCode className="h-5 w-5" />
                <span className="text-xs font-medium">Chrome DevTools</span>
              </Button>

              <Button
                type="button"
                variant={connectionMethod === "binary" ? "default" : "outline"}
                className="flex flex-col items-center p-3 h-auto gap-2"
                onClick={() => handleConnectionMethodChange("binary")}
                disabled={disabled}
              >
                <Terminal className="h-5 w-5" />
                <span className="text-xs font-medium">Browser Instance</span>
              </Button>

              <Button
                type="button"
                variant={connectionMethod === "local" ? "default" : "outline"}
                className="flex flex-col items-center p-3 h-auto gap-2"
                onClick={() => handleConnectionMethodChange("local")}
                disabled={disabled}
              >
                <Laptop className="h-5 w-5" />
                <span className="text-xs font-medium">Local Chrome</span>
              </Button>
            </div>

            {connectionMethod !== "default" && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="connectionUrl" className="text-sm">{getConnectionFieldLabel()}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoCircledIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        {connectionMethod === "wss" && "WebSocket URL for connecting to external browser providers."}
                        {connectionMethod === "cdp" && "URL for connecting to a Chrome instance via Chrome DevTools Protocol."}
                        {connectionMethod === "binary" && "Path to an existing Browser installation to access saved states and cookies."}
                        {connectionMethod === "local" && "Path to your Chrome executable for desktop automation."}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="connectionUrl"
                  placeholder={getConnectionFieldPlaceholder()}
                  value={getConnectionValue()}
                  onChange={(e) => handleConnectionUrlChange(e.target.value)}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  {connectionMethod === "wss" && "Example: wss://your-browser-provider.com/ws"}
                  {connectionMethod === "cdp" && "Example: http://localhost:9222"}
                  {connectionMethod === "binary" && "Full path to browser executable"}
                  {connectionMethod === "local" && (
                    <span>
                      Windows: C:\Program Files\Google\Chrome\Application\chrome.exe<br />
                      macOS: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome<br />
                      Linux: /usr/bin/google-chrome
                    </span>
                  )}
                </p>
              </div>
            )}

            {connectionMethod === "local" && (
              <Alert variant="default" className="mt-2">
                <InfoCircledIcon className="h-4 w-4 mr-2" />
                <AlertDescription>
                  Local Chrome configuration requires setting "Use Own Browser" to true in the Desktop Settings tab.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="desktop" className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Desktop Automation</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="useOwnBrowser" className="text-sm">Use Own Browser</Label>
                <p className="text-xs text-muted-foreground">Required for desktop automation</p>
              </div>
              <Switch 
                id="useOwnBrowser"
                checked={config.useOwnBrowser} 
                onCheckedChange={() => handleToggle('useOwnBrowser')}
                disabled={disabled}
              />
            </div>
            
            {config.useOwnBrowser && connectionMethod === "local" && (
              <div className="space-y-2">
                <Label htmlFor="chromePath" className="text-sm">Chrome Executable Path</Label>
                <Input
                  id="chromePath"
                  placeholder="e.g., C:\Program Files\Google\Chrome\Application\chrome.exe"
                  value={config.chromePath || ''}
                  onChange={(e) => handleInputChange('chromePath', e.target.value)}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Full path to Chrome executable on your system
                </p>
              </div>
            )}

            {connectionMethod !== "local" && config.useOwnBrowser && (
              <Alert variant="destructive" className="mt-2">
                <InfoCircledIcon className="h-4 w-4 mr-2" />
                <AlertDescription>
                  You've enabled "Use Own Browser" but you're not using the Local Chrome connection method. 
                  Consider switching to "Local Chrome" in the Connection tab for proper desktop automation.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label className="text-sm">Desktop Applications</Label>
              
              <div className="border rounded-md p-2 bg-muted/20">
                {(config.desktopApps || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">No applications configured</p>
                ) : (
                  <div className="space-y-2">
                    {(config.desktopApps || []).map((app, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                        <div>
                          <p className="text-sm font-medium">{app.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{app.path}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeDesktopApp(index)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-2 grid grid-cols-[1fr,1fr,auto] gap-2">
                  <Input
                    placeholder="App Name"
                    value={newApp.name}
                    onChange={(e) => setNewApp({...newApp, name: e.target.value})}
                    disabled={disabled}
                  />
                  <Input
                    placeholder="Path"
                    value={newApp.path}
                    onChange={(e) => setNewApp({...newApp, path: e.target.value})}
                    disabled={disabled}
                  />
                  <Button 
                    onClick={addDesktopApp}
                    disabled={disabled || !newApp.name || !newApp.path}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Add common desktop applications for automation tasks
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="desktopTimeout" className="text-sm">Session Timeout (minutes)</Label>
              <Input
                id="desktopTimeout"
                type="number"
                min={1}
                max={120}
                placeholder="30"
                value={config.desktopTimeout || 30}
                onChange={(e) => handleInputChange('desktopTimeout', e.target.value)}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Maximum duration for desktop automation sessions
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="streamDesktop" className="text-sm">Stream Desktop</Label>
                <p className="text-xs text-muted-foreground">View desktop operations in real-time</p>
              </div>
              <Switch 
                id="streamDesktop"
                checked={!!config.streamDesktop} 
                onCheckedChange={() => handleToggle('streamDesktop')}
                disabled={disabled}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Task Templates</h4>
            <p className="text-xs text-muted-foreground">
              Create reusable task templates for common automation workflows
            </p>
            
            <div className="border rounded-md p-2 bg-muted/20">
              {(config.taskTemplates || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">No templates configured</p>
              ) : (
                <div className="space-y-2">
                  {(config.taskTemplates || []).map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div>
                        <p className="text-sm font-medium">Template {index + 1}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[400px]">{template}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeTaskTemplate(index)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-2 space-y-2">
                <Textarea
                  placeholder="Enter a task template like: Go to website.com, login with username/password, download the monthly report"
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  disabled={disabled}
                  rows={3}
                />
                <Button 
                  onClick={addTaskTemplate}
                  disabled={disabled || !newTemplate.trim()}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="proxy" className="text-sm">Proxy URL</Label>
            <Input
              id="proxy"
              placeholder="http://username:password@proxy.example.com:8080"
              value={config.proxy || ''}
              onChange={(e) => handleInputChange('proxy', e.target.value)}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">Format: http://username:password@proxy.example.com:port</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="extraChromiumArgs" className="text-sm">Extra Chrome Arguments</Label>
            <Input
              id="extraChromiumArgs"
              placeholder="--disable-gpu --no-sandbox"
              value={config.extraChromiumArgs ? config.extraChromiumArgs.join(' ') : ''}
              onChange={(e) => handleInputChange('extraChromiumArgs', e.target.value)}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">Space-separated list of Chrome command line arguments</p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              Context Configuration
              <Badge variant="outline" className="font-normal">Advanced</Badge>
            </h4>

            <div className="space-y-2">
              <Label htmlFor="minWaitPageLoadTime" className="text-sm">Minimum Page Load Time (seconds)</Label>
              <Input
                id="minWaitPageLoadTime"
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                placeholder="0.5"
                value={config.contextConfig?.minWaitPageLoadTime || 0.5}
                onChange={(e) => handleContextConfigChange('minWaitPageLoadTime', parseFloat(e.target.value))}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitForNetworkIdlePageLoadTime" className="text-sm">Network Idle Timeout (seconds)</Label>
              <Input
                id="waitForNetworkIdlePageLoadTime"
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                placeholder="5.0"
                value={config.contextConfig?.waitForNetworkIdlePageLoadTime || 5.0}
                onChange={(e) => handleContextConfigChange('waitForNetworkIdlePageLoadTime', parseFloat(e.target.value))}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">Time to wait for network activity to cease. Increase for slower websites.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxWaitPageLoadTime" className="text-sm">Maximum Page Load Time (seconds)</Label>
              <Input
                id="maxWaitPageLoadTime"
                type="number"
                min={1}
                max={60}
                step={1}
                placeholder="15"
                value={config.contextConfig?.maxWaitPageLoadTime || 15.0}
                onChange={(e) => handleContextConfigChange('maxWaitPageLoadTime', parseFloat(e.target.value))}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="highlightElements" className="text-sm">Highlight Elements</Label>
                <p className="text-xs text-muted-foreground">Show visual indicators for interactive elements</p>
              </div>
              <Switch 
                id="highlightElements"
                checked={config.contextConfig?.highlightElements !== false} 
                onCheckedChange={(checked) => handleContextConfigChange('highlightElements', checked)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="viewportExpansion" className="text-sm">Viewport Expansion (pixels)</Label>
              <Input
                id="viewportExpansion"
                type="number"
                min={-1}
                max={1000}
                placeholder="500"
                value={config.contextConfig?.viewportExpansion || 500}
                onChange={(e) => handleContextConfigChange('viewportExpansion', parseInt(e.target.value))}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Controls how much of the page is included in the context. -1 for entire page, 0 for visible viewport only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userAgent" className="text-sm">User Agent</Label>
              <Input
                id="userAgent"
                placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
                value={config.contextConfig?.userAgent || ''}
                onChange={(e) => handleContextConfigChange('userAgent', e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale" className="text-sm">Locale</Label>
              <Input
                id="locale"
                placeholder="en-US"
                value={config.contextConfig?.locale || ''}
                onChange={(e) => handleContextConfigChange('locale', e.target.value)}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Affects language, date format and number formatting (e.g., en-US, de-DE)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowedDomains" className="text-sm">Allowed Domains</Label>
              <Input
                id="allowedDomains"
                placeholder="google.com,wikipedia.org"
                value={Array.isArray(config.contextConfig?.allowedDomains) 
                  ? config.contextConfig?.allowedDomains.join(',') 
                  : config.contextConfig?.allowedDomains || ''}
                onChange={(e) => {
                  const domains = e.target.value.split(',').map(d => d.trim()).filter(Boolean);
                  handleContextConfigChange('allowedDomains', domains.length > 0 ? domains : undefined);
                }}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of domains the browser is allowed to visit (leave empty for no restrictions)
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
