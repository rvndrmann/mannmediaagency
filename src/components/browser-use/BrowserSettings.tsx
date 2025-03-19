
import { useState } from "react";
import { BrowserConfig } from "@/hooks/browser-use/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrowserTheme } from "@/hooks/browser-use/types";

const RESOLUTIONS = [
  { label: "HD (1280×720)", value: "1280x720" },
  { label: "Full HD (1920×1080)", value: "1920x1080" },
  { label: "2K (2560×1440)", value: "2560x1440" },
  { label: "4K (3840×2160)", value: "3840x2160" },
  { label: "Custom", value: "custom" }
];

const THEMES: { label: string; value: BrowserTheme }[] = [
  { label: "Default", value: "Default" },
  { label: "Soft", value: "Soft" },
  { label: "Monochrome", value: "Monochrome" },
  { label: "Glass", value: "Glass" },
  { label: "Origin", value: "Origin" },
  { label: "Citrus", value: "Citrus" },
  { label: "Ocean", value: "Ocean" }
];

interface BrowserSettingsProps {
  config: BrowserConfig;
  onConfigChange: (config: BrowserConfig) => void;
}

export function BrowserSettings({ config, onConfigChange }: BrowserSettingsProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [customResolution, setCustomResolution] = useState(false);
  
  const updateConfig = <K extends keyof BrowserConfig>(key: K, value: BrowserConfig[K]) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };
  
  const updateContextConfig = <K extends keyof BrowserConfig["contextConfig"]>(
    key: K, 
    value: BrowserConfig["contextConfig"][K]
  ) => {
    onConfigChange({
      ...config,
      contextConfig: {
        ...config.contextConfig,
        [key]: value
      }
    });
  };
  
  const handleResolutionChange = (value: string) => {
    if (value === "custom") {
      setCustomResolution(true);
      return;
    }
    
    setCustomResolution(false);
    updateConfig("resolution", value);
    
    // Also update the browserWindowSize
    const [width, height] = value.split("x").map(Number);
    if (width && height) {
      updateContextConfig("browserWindowSize", { width, height });
    }
  };
  
  const handleCustomResolutionChange = (dimension: "width" | "height", value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    const newSize = {
      ...config.contextConfig.browserWindowSize,
      [dimension]: numValue
    };
    
    updateContextConfig("browserWindowSize", newSize);
    updateConfig("resolution", `${newSize.width}x${newSize.height}`);
  };
  
  // Determine if we're using a custom resolution that's not in the presets
  const getResolutionValue = () => {
    if (customResolution) return "custom";
    
    const currentResolution = config.resolution;
    const matchingPreset = RESOLUTIONS.find(r => r.value === currentResolution);
    
    return matchingPreset ? currentResolution : "custom";
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-lg font-semibold">Browser Settings</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="persistentSession" className="flex-1">
                  Persistent Session
                  <div className="text-xs text-muted-foreground">
                    Keep browser open between tasks
                  </div>
                </Label>
                <Switch
                  id="persistentSession"
                  checked={config.persistentSession}
                  onCheckedChange={(checked) => updateConfig("persistentSession", checked)}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="useOwnBrowser" className="flex-1">
                  Use Own Browser
                  <div className="text-xs text-muted-foreground">
                    Use your locally installed browser
                  </div>
                </Label>
                <Switch
                  id="useOwnBrowser"
                  checked={config.useOwnBrowser}
                  onCheckedChange={(checked) => updateConfig("useOwnBrowser", checked)}
                />
              </div>
            </div>
            
            {config.useOwnBrowser && (
              <div className="space-y-3 mt-3 p-3 border rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="chromePath">Chrome Path</Label>
                  <Input
                    id="chromePath"
                    placeholder="e.g., C:\Program Files\Google\Chrome\Application\chrome.exe"
                    value={config.chromePath || ""}
                    onChange={(e) => updateConfig("chromePath", e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Full path to Chrome executable on your system
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chromeUserData">User Data Directory (Optional)</Label>
                  <Input
                    id="chromeUserData"
                    placeholder="Path to Chrome user data folder"
                    value={config.chromeUserData || ""}
                    onChange={(e) => updateConfig("chromeUserData", e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Path to Chrome User Data folder to use existing profile
                  </div>
                </div>
                
                <Alert variant="warning" className="mt-2">
                  <AlertDescription>
                    Close all Chrome windows before using this feature.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={config.theme as string} 
                onValueChange={(value) => updateConfig("theme", value as BrowserTheme)}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode" className="flex-1">
                  Dark Mode
                  <div className="text-xs text-muted-foreground">
                    Use dark theme in browser
                  </div>
                </Label>
                <Switch
                  id="darkMode"
                  checked={config.darkMode}
                  onCheckedChange={(checked) => updateConfig("darkMode", checked)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="display" className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={getResolutionValue()} onValueChange={handleResolutionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((resolution) => (
                    <SelectItem key={resolution.value} value={resolution.value}>
                      {resolution.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(customResolution || getResolutionValue() === "custom") && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="resolutionWidth" className="text-xs">Width</Label>
                    <Input
                      id="resolutionWidth"
                      type="number"
                      min={800}
                      max={3840}
                      value={config.contextConfig.browserWindowSize.width}
                      onChange={(e) => handleCustomResolutionChange("width", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="resolutionHeight" className="text-xs">Height</Label>
                    <Input
                      id="resolutionHeight"
                      type="number"
                      min={600}
                      max={2160}
                      value={config.contextConfig.browserWindowSize.height}
                      onChange={(e) => handleCustomResolutionChange("height", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="viewportExpansion">
                  Viewport Expansion
                  <div className="text-xs text-muted-foreground">
                    Extra pixels to add to viewport height for scrolling
                  </div>
                </Label>
                <span className="text-sm">{config.contextConfig.viewportExpansion}px</span>
              </div>
              <Slider
                id="viewportExpansion"
                min={0}
                max={2000}
                step={100}
                value={[config.contextConfig.viewportExpansion]}
                onValueChange={([value]) => updateContextConfig("viewportExpansion", value)}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="highlightElements" className="flex-1">
                  Highlight Elements
                  <div className="text-xs text-muted-foreground">
                    Visually highlight elements when interacting
                  </div>
                </Label>
                <Switch
                  id="highlightElements"
                  checked={config.contextConfig.highlightElements}
                  onCheckedChange={(checked) => updateContextConfig("highlightElements", checked)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="headless" className="flex-1">
                  Headless Mode
                  <div className="text-xs text-muted-foreground">
                    Run without visible browser window
                  </div>
                </Label>
                <Switch
                  id="headless"
                  checked={config.headless}
                  onCheckedChange={(checked) => updateConfig("headless", checked)}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="disableSecurity" className="flex-1">
                  Disable Security
                  <div className="text-xs text-muted-foreground">
                    Disable web security features for testing
                  </div>
                </Label>
                <Switch
                  id="disableSecurity"
                  checked={config.disableSecurity}
                  onCheckedChange={(checked) => updateConfig("disableSecurity", checked)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="minWaitPageLoadTime">
                  Min. Page Load Wait
                  <div className="text-xs text-muted-foreground">
                    Minimum time to wait (in seconds)
                  </div>
                </Label>
                <span className="text-sm">{config.contextConfig.minWaitPageLoadTime}s</span>
              </div>
              <Slider
                id="minWaitPageLoadTime"
                min={0}
                max={5}
                step={0.1}
                value={[config.contextConfig.minWaitPageLoadTime]}
                onValueChange={([value]) => updateContextConfig("minWaitPageLoadTime", value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="waitForNetworkIdlePageLoadTime">
                  Network Idle Wait
                  <div className="text-xs text-muted-foreground">
                    Time to wait for network idle (in seconds)
                  </div>
                </Label>
                <span className="text-sm">{config.contextConfig.waitForNetworkIdlePageLoadTime}s</span>
              </div>
              <Slider
                id="waitForNetworkIdlePageLoadTime"
                min={0}
                max={30}
                step={0.5}
                value={[config.contextConfig.waitForNetworkIdlePageLoadTime]}
                onValueChange={([value]) => updateContextConfig("waitForNetworkIdlePageLoadTime", value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="maxWaitPageLoadTime">
                  Max. Page Load Wait
                  <div className="text-xs text-muted-foreground">
                    Maximum time to wait (in seconds)
                  </div>
                </Label>
                <span className="text-sm">{config.contextConfig.maxWaitPageLoadTime}s</span>
              </div>
              <Slider
                id="maxWaitPageLoadTime"
                min={1}
                max={60}
                step={1}
                value={[config.contextConfig.maxWaitPageLoadTime]}
                onValueChange={([value]) => updateContextConfig("maxWaitPageLoadTime", value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userAgent">User Agent (Optional)</Label>
              <Input
                id="userAgent"
                placeholder="Custom user agent string"
                value={config.contextConfig.userAgent || ""}
                onChange={(e) => updateContextConfig("userAgent", e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
