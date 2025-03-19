
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrowserConfig, BrowserTheme, ProxyConfig } from "@/hooks/browser-use/types";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BrowserSettingsProps {
  config: BrowserConfig;
  onConfigChange: (config: BrowserConfig) => void;
}

export function BrowserSettings({ config, onConfigChange }: BrowserSettingsProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Default proxy config
  const defaultProxyConfig: ProxyConfig = {
    server: '',
    username: '',
    password: '',
    bypass: ''
  };
  
  // Get the proxy config safely
  const getProxyConfig = (): ProxyConfig => {
    if (!config.proxy) return defaultProxyConfig;
    if (typeof config.proxy === 'string') {
      return { server: config.proxy, username: '', password: '', bypass: '' };
    }
    return config.proxy;
  };
  
  // Get the proxy config
  const proxy = getProxyConfig();
  
  const handleChange = <K extends keyof BrowserConfig>(key: K, value: BrowserConfig[K]) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };
  
  const handleContextConfigChange = <K extends keyof BrowserConfig["contextConfig"]>(
    key: K,
    value: BrowserConfig["contextConfig"][K]
  ) => {
    onConfigChange({
      ...config,
      contextConfig: {
        ...config.contextConfig,
        [key]: value,
      },
    });
  };
  
  const handleProxyConfigChange = <K extends keyof ProxyConfig>(
    key: K,
    value: ProxyConfig[K]
  ) => {
    const updatedProxy = { ...proxy, [key]: value };
    onConfigChange({
      ...config,
      proxy: updatedProxy,
    });
  };
  
  const handleBrowserSizeChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    
    onConfigChange({
      ...config,
      contextConfig: {
        ...config.contextConfig,
        browserWindowSize: {
          ...config.contextConfig.browserWindowSize,
          [dimension]: numValue,
        },
      },
    });
  };
  
  const handleResetToDefaults = () => {
    try {
      setIsUpdating(true);
      const defaultConfig: BrowserConfig = {
        persistentSession: false,
        useOwnBrowser: false,
        resolution: "1920x1080",
        theme: "Ocean",
        darkMode: false,
        headless: false,
        disableSecurity: true,
        contextConfig: {
          minWaitPageLoadTime: 0.5,
          waitForNetworkIdlePageLoadTime: 1.0,
          maxWaitPageLoadTime: 5.0,
          browserWindowSize: { width: 1280, height: 1100 },
          highlightElements: true,
          viewportExpansion: 500
        }
      };
      
      onConfigChange(defaultConfig);
      localStorage.setItem('browserUseConfig', JSON.stringify(defaultConfig));
      toast.success('Browser settings reset to defaults');
    } catch (error) {
      console.error('Error resetting browser settings:', error);
      toast.error('Failed to reset browser settings');
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex justify-between items-center">
          <span>Browser Settings</span>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetToDefaults}
              disabled={isUpdating}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Configure how the browser automation works
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="persistentSession" className="text-sm font-medium">
                    Persistent Session
                  </Label>
                  <Switch
                    id="persistentSession"
                    checked={config.persistentSession}
                    onCheckedChange={(checked) => handleChange('persistentSession', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep browser state between sessions
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="useOwnBrowser" className="text-sm font-medium">
                    Use Own Browser
                  </Label>
                  <Switch
                    id="useOwnBrowser"
                    checked={config.useOwnBrowser}
                    onCheckedChange={(checked) => handleChange('useOwnBrowser', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use your own Chrome installation
                </p>
              </div>
              
              {config.useOwnBrowser && (
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="chromePath" className="text-sm font-medium">
                    Chrome Executable Path
                  </Label>
                  <Input
                    id="chromePath"
                    placeholder="Path to Chrome executable"
                    value={config.chromePath || ''}
                    onChange={(e) => handleChange('chromePath', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Full path to your Chrome/Chromium executable
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="resolution" className="text-sm font-medium">
                  Resolution
                </Label>
                <Select
                  value={config.resolution}
                  onValueChange={(value) => handleChange('resolution', value)}
                >
                  <SelectTrigger id="resolution">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1280x720">1280x720</SelectItem>
                    <SelectItem value="1366x768">1366x768</SelectItem>
                    <SelectItem value="1600x900">1600x900</SelectItem>
                    <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                    <SelectItem value="2560x1440">2560x1440 (2K)</SelectItem>
                    <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="headless" className="text-sm font-medium">
                    Headless Mode
                  </Label>
                  <Switch
                    id="headless"
                    checked={config.headless || false}
                    onCheckedChange={(checked) => handleChange('headless', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Run browser without visible UI (faster)
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="disableSecurity" className="text-sm font-medium">
                    Disable Security Features
                  </Label>
                  <Switch
                    id="disableSecurity"
                    checked={config.disableSecurity || false}
                    onCheckedChange={(checked) => handleChange('disableSecurity', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Disable browser security features (helps with some websites)
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-sm font-medium">
                  Theme
                </Label>
                <Select
                  value={config.theme || 'Default'}
                  onValueChange={(value) => handleChange('theme', value as BrowserTheme)}
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Default">Default</SelectItem>
                    <SelectItem value="Soft">Soft</SelectItem>
                    <SelectItem value="Monochrome">Monochrome</SelectItem>
                    <SelectItem value="Glass">Glass</SelectItem>
                    <SelectItem value="Origin">Origin</SelectItem>
                    <SelectItem value="Citrus">Citrus</SelectItem>
                    <SelectItem value="Ocean">Ocean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="darkMode" className="text-sm font-medium">
                    Dark Mode
                  </Label>
                  <Switch
                    id="darkMode"
                    checked={config.darkMode || false}
                    onCheckedChange={(checked) => handleChange('darkMode', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use dark theme in the live preview
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="highlightElements" className="text-sm font-medium">
                    Highlight Elements
                  </Label>
                  <Switch
                    id="highlightElements"
                    checked={config.contextConfig.highlightElements || false}
                    onCheckedChange={(checked) => handleContextConfigChange('highlightElements', checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Highlight elements that the browser is interacting with
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Browser Window Size</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width" className="text-xs text-muted-foreground">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={config.contextConfig.browserWindowSize.width || 1280}
                    onChange={(e) => handleBrowserSizeChange('width', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs text-muted-foreground">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={config.contextConfig.browserWindowSize.height || 800}
                    onChange={(e) => handleBrowserSizeChange('height', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <Button 
              variant="outline" 
              type="button" 
              className="w-full justify-between"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Advanced Settings
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showAdvanced && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Page Load Timing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minWaitPageLoadTime" className="text-xs">
                        Min Wait Time (seconds)
                      </Label>
                      <Input
                        id="minWaitPageLoadTime"
                        type="number"
                        step="0.1"
                        min="0"
                        value={config.contextConfig.minWaitPageLoadTime || 0.5}
                        onChange={(e) => handleContextConfigChange('minWaitPageLoadTime', parseFloat(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="waitForNetworkIdlePageLoadTime" className="text-xs">
                        Network Idle Wait (seconds)
                      </Label>
                      <Input
                        id="waitForNetworkIdlePageLoadTime"
                        type="number"
                        step="0.1"
                        min="0"
                        value={config.contextConfig.waitForNetworkIdlePageLoadTime || 1.0}
                        onChange={(e) => handleContextConfigChange('waitForNetworkIdlePageLoadTime', parseFloat(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxWaitPageLoadTime" className="text-xs">
                        Max Wait Time (seconds)
                      </Label>
                      <Input
                        id="maxWaitPageLoadTime"
                        type="number"
                        step="0.1"
                        min="1"
                        value={config.contextConfig.maxWaitPageLoadTime || 5.0}
                        onChange={(e) => handleContextConfigChange('maxWaitPageLoadTime', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Proxy Settings</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="proxyServer" className="text-xs">
                        Proxy Server (required)
                      </Label>
                      <Input
                        id="proxyServer"
                        placeholder="e.g., http://proxy.example.com:8080"
                        value={proxy.server}
                        onChange={(e) => handleProxyConfigChange('server', e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="proxyUsername" className="text-xs">
                          Username
                        </Label>
                        <Input
                          id="proxyUsername"
                          placeholder="Proxy username"
                          value={proxy.username || ''}
                          onChange={(e) => handleProxyConfigChange('username', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="proxyPassword" className="text-xs">
                          Password
                        </Label>
                        <Input
                          id="proxyPassword"
                          type="password"
                          placeholder="Proxy password"
                          value={proxy.password || ''}
                          onChange={(e) => handleProxyConfigChange('password', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="proxyBypass" className="text-xs">
                        Bypass List
                      </Label>
                      <Input
                        id="proxyBypass"
                        placeholder="e.g., localhost,*.internal.domain"
                        value={proxy.bypass || ''}
                        onChange={(e) => handleProxyConfigChange('bypass', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Comma-separated list of hosts to bypass proxy
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Advanced Browser Settings</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="extraChromiumArgs" className="text-xs">
                        Extra Chromium Arguments
                      </Label>
                      <Input
                        id="extraChromiumArgs"
                        placeholder="e.g., --no-sandbox,--disable-gpu"
                        value={Array.isArray(config.extraChromiumArgs) 
                          ? config.extraChromiumArgs.join(',') 
                          : config.extraChromiumArgs || ''}
                        onChange={(e) => handleChange('extraChromiumArgs', e.target.value.split(',').filter(Boolean))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Comma-separated list of additional Chromium command-line arguments
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="userAgent" className="text-xs">
                        Custom User Agent
                      </Label>
                      <Input
                        id="userAgent"
                        placeholder="Custom User-Agent string"
                        value={config.contextConfig.userAgent || ''}
                        onChange={(e) => handleContextConfigChange('userAgent', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="viewportExpansion" className="text-xs">
                        Viewport Expansion (px)
                      </Label>
                      <Input
                        id="viewportExpansion"
                        type="number"
                        min="0"
                        value={config.contextConfig.viewportExpansion || 0}
                        onChange={(e) => handleContextConfigChange('viewportExpansion', parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Extra space added beyond the visible viewport for scrolling
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
