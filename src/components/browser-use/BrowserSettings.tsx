
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrowserConfig, BrowserTheme, BrowserContextConfig } from "@/hooks/browser-use/types";
import { Monitor, Moon, Sun, Palette, Laptop2, Settings, Globe, Shield, Code, Network, Clock } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BrowserSettingsProps {
  config: BrowserConfig;
  onConfigChange: (config: BrowserConfig) => void;
}

export function BrowserSettings({ config, onConfigChange }: BrowserSettingsProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleConfigChange = <K extends keyof BrowserConfig>(key: K, value: BrowserConfig[K]) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  const handleContextConfigChange = <K extends keyof BrowserContextConfig>(key: K, value: BrowserContextConfig[K]) => {
    const updatedContextConfig = {
      ...(config.contextConfig || {}),
      [key]: value
    };
    
    onConfigChange({
      ...config,
      contextConfig: updatedContextConfig
    });
  };

  const themes: BrowserTheme[] = ['Default', 'Soft', 'Monochrome', 'Glass', 'Origin', 'Citrus', 'Ocean'];

  return (
    <Card className="p-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
        </TabsList>
        
        {/* Basic Tab */}
        <TabsContent value="basic" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center">
              <Palette className="h-5 w-5 mr-2 text-primary" />
              UI Theme
            </h3>
            <div className="flex items-center">
              <Sun className="h-4 w-4 mr-2" />
              <Switch
                checked={config.darkMode}
                onCheckedChange={(checked) => handleConfigChange('darkMode', checked)}
              />
              <Moon className="h-4 w-4 ml-2" />
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Theme Style</Label>
              <Select
                value={config.theme || 'Ocean'}
                onValueChange={(value) => handleConfigChange('theme', value as BrowserTheme)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme} value={theme}>
                      {theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label htmlFor="persistent-session" className="cursor-pointer">Persistent Browser</Label>
              </div>
              <Switch
                id="persistent-session"
                checked={config.persistentSession}
                onCheckedChange={(checked) => handleConfigChange('persistentSession', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label htmlFor="headless" className="cursor-pointer">Headless Mode</Label>
              </div>
              <Switch
                id="headless"
                checked={config.headless || false}
                onCheckedChange={(checked) => handleConfigChange('headless', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label htmlFor="disable-security" className="cursor-pointer">Disable Security</Label>
              </div>
              <Switch
                id="disable-security"
                checked={config.disableSecurity || false}
                onCheckedChange={(checked) => handleConfigChange('disableSecurity', checked)}
              />
            </div>

            <div>
              <Label className="flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                Resolution
              </Label>
              <Input
                placeholder="Width x Height (e.g., 1920x1080)"
                value={config.resolution || '1920x1080'}
                onChange={(e) => handleConfigChange('resolution', e.target.value)}
              />
            </div>
          </div>
        </TabsContent>
        
        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary" />
              Connection Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Connection Mode</Label>
                <ToggleGroup 
                  type="single" 
                  className="justify-start mt-2"
                  value={config.wssUrl ? "wss" : config.cdpUrl ? "cdp" : config.useOwnBrowser ? "own" : "default"}
                  onValueChange={(value) => {
                    if (value) {
                      // Reset other connection options
                      const updated = {
                        ...config,
                        wssUrl: undefined,
                        cdpUrl: undefined,
                        useOwnBrowser: false
                      };
                      
                      // Set the selected option
                      if (value === "wss") updated.wssUrl = "";
                      if (value === "cdp") updated.cdpUrl = "";
                      if (value === "own") updated.useOwnBrowser = true;
                      
                      onConfigChange(updated);
                    }
                  }}
                >
                  <ToggleGroupItem value="default">Default</ToggleGroupItem>
                  <ToggleGroupItem value="wss">WebSocket</ToggleGroupItem>
                  <ToggleGroupItem value="cdp">CDP</ToggleGroupItem>
                  <ToggleGroupItem value="own">Own Browser</ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              {config.wssUrl !== undefined && (
                <div>
                  <Label htmlFor="wss-url">WebSocket URL (wss)</Label>
                  <Input
                    id="wss-url"
                    placeholder="wss://your-browser-provider.com/ws"
                    value={config.wssUrl || ''}
                    onChange={(e) => handleConfigChange('wssUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect to cloud-based browser services (e.g. anchorbrowser.io)
                  </p>
                </div>
              )}
              
              {config.cdpUrl !== undefined && (
                <div>
                  <Label htmlFor="cdp-url">Chrome DevTools Protocol URL</Label>
                  <Input
                    id="cdp-url"
                    placeholder="http://localhost:9222"
                    value={config.cdpUrl || ''}
                    onChange={(e) => handleConfigChange('cdpUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect to Chrome instance via CDP for debugging
                  </p>
                </div>
              )}
              
              {config.useOwnBrowser && (
                <>
                  <div>
                    <Label>Chrome Path</Label>
                    <Input
                      placeholder="Path to Chrome executable"
                      value={config.chromePath || ''}
                      onChange={(e) => handleConfigChange('chromePath', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>User Data Directory</Label>
                    <Input
                      placeholder="Path to Chrome user data (leave empty for default)"
                      value={config.chromeUserData || ''}
                      onChange={(e) => handleConfigChange('chromeUserData', e.target.value)}
                    />
                  </div>
                </>
              )}
              
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center justify-between w-full">
                    <span>Additional Options</span>
                    <Code className="h-4 w-4 ml-2" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div>
                    <Label htmlFor="extra-args">Extra Chromium Arguments</Label>
                    <Textarea
                      id="extra-args"
                      placeholder="--disable-web-security --no-sandbox"
                      value={(config.extraChromiumArgs || []).join(' ')}
                      onChange={(e) => handleConfigChange('extraChromiumArgs', e.target.value.split(' ').filter(Boolean))}
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Proxy Configuration</Label>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="proxy-server" className="text-xs">Server</Label>
                        <Input
                          id="proxy-server"
                          placeholder="http://proxy.example.com:8080"
                          value={config.proxy?.server || ''}
                          onChange={(e) => handleConfigChange('proxy', {
                            ...(config.proxy || {}),
                            server: e.target.value
                          })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="proxy-username" className="text-xs">Username</Label>
                          <Input
                            id="proxy-username"
                            placeholder="username"
                            value={config.proxy?.username || ''}
                            onChange={(e) => handleConfigChange('proxy', {
                              ...(config.proxy || {}),
                              username: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="proxy-password" className="text-xs">Password</Label>
                          <Input
                            id="proxy-password"
                            placeholder="password"
                            type="password"
                            value={config.proxy?.password || ''}
                            onChange={(e) => handleConfigChange('proxy', {
                              ...(config.proxy || {}),
                              password: e.target.value
                            })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="proxy-bypass" className="text-xs">Bypass List</Label>
                        <Input
                          id="proxy-bypass"
                          placeholder="localhost,*.example.com"
                          value={config.proxy?.bypass || ''}
                          onChange={(e) => handleConfigChange('proxy', {
                            ...(config.proxy || {}),
                            bypass: e.target.value
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </TabsContent>
        
        {/* Context Tab */}
        <TabsContent value="context" className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Globe className="h-5 w-5 mr-2 text-primary" />
            Browser Context Settings
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Page Load Timing
              </h4>
              <div className="grid gap-2">
                <div>
                  <Label className="text-xs">Minimum Wait Time (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.5"
                    value={config.contextConfig?.minWaitPageLoadTime || ''}
                    onChange={(e) => handleContextConfigChange('minWaitPageLoadTime', 
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Network Idle Wait Time (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="1.0"
                    value={config.contextConfig?.waitForNetworkIdlePageLoadTime || ''}
                    onChange={(e) => handleContextConfigChange('waitForNetworkIdlePageLoadTime', 
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Maximum Wait Time (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="5.0"
                    value={config.contextConfig?.maxWaitPageLoadTime || ''}
                    onChange={(e) => handleContextConfigChange('maxWaitPageLoadTime', 
                      e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                Display Settings
              </h4>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Window Width</Label>
                    <Input
                      type="number"
                      min="320"
                      step="1"
                      placeholder="1280"
                      value={config.contextConfig?.browserWindowSize?.width || ''}
                      onChange={(e) => {
                        const width = e.target.value ? parseInt(e.target.value) : undefined;
                        const height = config.contextConfig?.browserWindowSize?.height;
                        handleContextConfigChange('browserWindowSize', 
                          width ? { width, height: height || 1100 } : undefined);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Window Height</Label>
                    <Input
                      type="number"
                      min="240"
                      step="1"
                      placeholder="1100"
                      value={config.contextConfig?.browserWindowSize?.height || ''}
                      onChange={(e) => {
                        const height = e.target.value ? parseInt(e.target.value) : undefined;
                        const width = config.contextConfig?.browserWindowSize?.width;
                        handleContextConfigChange('browserWindowSize', 
                          height ? { height, width: width || 1280 } : undefined);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Locale</Label>
                  <Input
                    placeholder="en-US"
                    value={config.contextConfig?.locale || ''}
                    onChange={(e) => handleContextConfigChange('locale', e.target.value || undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">User Agent</Label>
                  <Input
                    placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
                    value={config.contextConfig?.userAgent || ''}
                    onChange={(e) => handleContextConfigChange('userAgent', e.target.value || undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Viewport Expansion (pixels)</Label>
                  <Input
                    type="number"
                    min="-1"
                    step="50"
                    placeholder="500"
                    value={config.contextConfig?.viewportExpansion ?? ''}
                    onChange={(e) => handleContextConfigChange('viewportExpansion', 
                      e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls how much of the page is included in LLM context. Use -1 for entire page.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="highlight-elements"
                    checked={config.contextConfig?.highlightElements !== false}
                    onCheckedChange={(checked) => 
                      handleContextConfigChange('highlightElements', checked === 'indeterminate' ? undefined : checked)}
                  />
                  <Label 
                    htmlFor="highlight-elements" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    Highlight interactive elements
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Security Settings
              </h4>
              <div>
                <Label className="text-xs">Allowed Domains</Label>
                <Textarea
                  placeholder="google.com, wikipedia.org"
                  value={config.contextConfig?.allowedDomains?.join(', ') || ''}
                  onChange={(e) => {
                    const domains = e.target.value
                      .split(',')
                      .map(domain => domain.trim())
                      .filter(Boolean);
                    handleContextConfigChange('allowedDomains', domains.length > 0 ? domains : undefined);
                  }}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  List of domains the agent can access. Leave empty to allow all domains.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Network className="h-4 w-4 mr-2" />
                Debugging & State
              </h4>
              <div className="grid gap-2">
                <div>
                  <Label className="text-xs">Recording Path</Label>
                  <Input
                    placeholder="/path/to/recording/directory"
                    value={config.contextConfig?.saveRecordingPath || ''}
                    onChange={(e) => handleContextConfigChange('saveRecordingPath', e.target.value || undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Trace Path</Label>
                  <Input
                    placeholder="/path/to/trace/directory"
                    value={config.contextConfig?.tracePath || ''}
                    onChange={(e) => handleContextConfigChange('tracePath', e.target.value || undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cookies File</Label>
                  <Input
                    placeholder="/path/to/cookies.json"
                    value={config.contextConfig?.cookiesFile || ''}
                    onChange={(e) => handleContextConfigChange('cookiesFile', e.target.value || undefined)}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
