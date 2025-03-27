import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrowserConfig, SensitiveDataItem } from "@/hooks/browser-use/types";
import { ProxyHelper } from "@/components/browser-use/ProxyHelper";
import { SensitiveDataManager } from "@/components/browser-use/SensitiveDataManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BrowserConfigPanelProps {
  config: BrowserConfig;
  setConfig: (config: BrowserConfig) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  environment?: string;
  setEnvironment?: (env: 'browser' | 'desktop') => void;
}

export function BrowserConfigPanel({
  config,
  setConfig,
  isProcessing = false,
  disabled = false,
  environment = 'browser',
  setEnvironment
}: BrowserConfigPanelProps) {
  const [defaultOpen, setDefaultOpen] = useState<string[]>(["resolution"]);

  // Handle different input types
  const handleBooleanChange = (field: keyof BrowserConfig) => (value: boolean) => {
    setConfig({ ...config, [field]: value });
  };

  const handleStringChange = (field: keyof BrowserConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [field]: e.target.value });
  };

  const handleSelectChange = (field: keyof BrowserConfig) => (value: string) => {
    setConfig({ ...config, [field]: value });
  };

  const handleContextConfigChange = (field: keyof Required<BrowserConfig>['contextConfig']) => (
    value: any
  ) => {
    setConfig({
      ...config,
      contextConfig: {
        ...config.contextConfig,
        [field]: typeof value === 'object' && value.target ? value.target.value : value
      }
    });
  };

  const handleSensitiveDataChange = (data: SensitiveDataItem[]) => {
    setConfig({
      ...config,
      sensitiveData: data
    });
  };

  const handleTestProxy = async () => {
    if (!config.proxy) {
      toast.error("No proxy configured to test");
      return;
    }

    try {
      toast.info("Testing proxy connection...");
      
      // Use browser-use-api edge function to test the proxy
      const { data, error } = await fetch("/api/test-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          proxyUrl: config.proxy,
          testUrl: "https://httpbin.org/ip"
        })
      }).then(res => res.json());
      
      if (error) throw new Error(error.message || "Proxy test failed");
      
      if (data && data.success) {
        toast.success(`Proxy connection successful: ${data.message || "Connected"}`);
      } else {
        toast.error(`Proxy test failed: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error testing proxy:", error);
      toast.error(`Proxy test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const resolutions = [
    "800x600", "1024x768", "1280x720", "1366x768", 
    "1440x900", "1600x900", "1920x1080", "2560x1440"
  ];

  const themes = [
    "Ocean", "Forest", "Sunset", "Monochrome", 
    "Neon", "Pastel", "Dark", "Light"
  ];

  return (
    <div className="space-y-6">
      <Accordion 
        type="multiple" 
        defaultValue={defaultOpen} 
        className="w-full"
      >
        {/* Basic Configuration */}
        <AccordionItem value="basic">
          <AccordionTrigger className="text-base font-medium">
            Basic Configuration
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="resolution">Screen Resolution</Label>
                  <Select 
                    value={config.resolution} 
                    onValueChange={handleSelectChange("resolution")}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      {resolutions.map((res) => (
                        <SelectItem key={res} value={res}>{res}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Browser Theme</Label>
                  <Select 
                    value={config.theme} 
                    onValueChange={handleSelectChange("theme")}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="darkMode" 
                  checked={config.darkMode} 
                  onCheckedChange={handleBooleanChange("darkMode")}
                  disabled={disabled}
                />
                <Label htmlFor="darkMode">Dark Mode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="headless" 
                  checked={config.headless} 
                  onCheckedChange={handleBooleanChange("headless")}
                  disabled={disabled}
                />
                <Label htmlFor="headless">Run in Headless Mode</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="persistentSession" 
                  checked={config.persistentSession} 
                  onCheckedChange={handleBooleanChange("persistentSession")}
                  disabled={disabled}
                />
                <Label htmlFor="persistentSession">Persistent Browser Session</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Advanced Configuration */}
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-base font-medium">
            Advanced Configuration
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 p-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="disableSecurity" 
                  checked={config.disableSecurity} 
                  onCheckedChange={handleBooleanChange("disableSecurity")}
                  disabled={disabled}
                />
                <Label htmlFor="disableSecurity">Disable Security Features (use with caution)</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="useOwnBrowser" 
                  checked={false}
                  onCheckedChange={() => {}}
                  disabled={true}
                />
                <Label htmlFor="useOwnBrowser" className="flex items-center gap-2">
                  Use My Own Chrome Browser 
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </Label>
              </div>
              
              {config.useOwnBrowser && (
                <div className="space-y-2 opacity-50 cursor-not-allowed">
                  <Label htmlFor="chromePath">Chrome Executable Path</Label>
                  <Input 
                    id="chromePath" 
                    value={config.chromePath} 
                    onChange={() => {}}
                    placeholder="/path/to/chrome"
                    disabled={true}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide the full path to the Chrome executable on your system
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Proxy Configuration */}
        <AccordionItem value="proxy">
          <AccordionTrigger className="text-base font-medium">
            Proxy Configuration
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 p-2">
              <div className="space-y-2">
                <Label htmlFor="proxy">Proxy URL</Label>
                <div className="flex gap-2">
                  <Input 
                    id="proxy" 
                    value={config.proxy || ''} 
                    onChange={handleStringChange("proxy")}
                    placeholder="http://proxy.example.com:8080"
                    disabled={disabled}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleTestProxy}
                    disabled={disabled || !config.proxy}
                  >
                    Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports HTTP, HTTPS, SOCKS4, SOCKS5 formats
                </p>
              </div>
              
              <ProxyHelper 
                proxyUrl={config.proxy || ""}
                onProxyUrlChange={(url) => setConfig({...config, proxy: url})}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Sensitive Data */}
        <AccordionItem value="sensitiveData">
          <AccordionTrigger className="text-base font-medium">
            Sensitive Data
          </AccordionTrigger>
          <AccordionContent>
            <SensitiveDataManager
              sensitiveData={config.sensitiveData || []}
              onChange={handleSensitiveDataChange}
              disabled={disabled}
            />
          </AccordionContent>
        </AccordionItem>
        
        {/* Timing and Network Settings */}
        <AccordionItem value="timing">
          <AccordionTrigger className="text-base font-medium">
            Timing and Network Settings
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 p-2">
              <div className="space-y-2">
                <Label htmlFor="minWaitPageLoadTime">Minimum Page Load Wait Time (seconds)</Label>
                <Input 
                  id="minWaitPageLoadTime" 
                  type="number"
                  value={config.contextConfig?.minWaitPageLoadTime || 0.5} 
                  onChange={(e) => handleContextConfigChange("minWaitPageLoadTime")(parseFloat(e.target.value))}
                  min="0"
                  step="0.1"
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="waitForNetworkIdlePageLoadTime">Wait for Network Idle Time (seconds)</Label>
                <Input 
                  id="waitForNetworkIdlePageLoadTime" 
                  type="number"
                  value={config.contextConfig?.waitForNetworkIdlePageLoadTime || 5.0} 
                  onChange={(e) => handleContextConfigChange("waitForNetworkIdlePageLoadTime")(parseFloat(e.target.value))}
                  min="0"
                  step="0.5"
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxWaitPageLoadTime">Maximum Page Load Timeout (seconds)</Label>
                <Input 
                  id="maxWaitPageLoadTime" 
                  type="number"
                  value={config.contextConfig?.maxWaitPageLoadTime || 15.0} 
                  onChange={(e) => handleContextConfigChange("maxWaitPageLoadTime")(parseFloat(e.target.value))}
                  min="0"
                  step="0.5"
                  disabled={disabled}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Visual Settings */}
        <AccordionItem value="visual">
          <AccordionTrigger className="text-base font-medium">
            Visual Settings
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 p-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="highlightElements" 
                  checked={config.contextConfig?.highlightElements !== false}
                  onCheckedChange={(checked) => handleContextConfigChange("highlightElements")(checked)}
                  disabled={disabled}
                />
                <Label htmlFor="highlightElements">Highlight Elements During Interaction</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="viewportExpansion">Viewport Expansion (pixels)</Label>
                <Input 
                  id="viewportExpansion" 
                  type="number"
                  value={config.contextConfig?.viewportExpansion || 500} 
                  onChange={(e) => handleContextConfigChange("viewportExpansion")(parseInt(e.target.value))}
                  min="0"
                  step="50"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Additional space to scroll during viewport expansion
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
