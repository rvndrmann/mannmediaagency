
import { BrowserConfig } from "@/hooks/browser-use/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface BrowserSettingsProps {
  browserConfig: BrowserConfig;
  onConfigChange: (newConfig: BrowserConfig) => void;
  isProcessing: boolean;
}

export function BrowserSettings({ 
  browserConfig, 
  onConfigChange,
  isProcessing
}: BrowserSettingsProps) {
  // Handler for updating top-level settings
  const updateConfig = (key: keyof BrowserConfig, value: any) => {
    onConfigChange({
      ...browserConfig,
      [key]: value
    });
  };
  
  // Handler for updating context config settings
  const updateContextConfig = (key: string, value: any) => {
    onConfigChange({
      ...browserConfig,
      contextConfig: {
        ...browserConfig.contextConfig,
        [key]: value
      }
    });
  };
  
  // Helper for parsing numeric inputs
  const parseNumber = (value: string) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Browser Settings</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how the browser operates. These settings can affect performance, 
          security, and behavior of the automated browser.
        </p>
      </div>
      
      <Accordion type="single" collapsible defaultValue="basic-settings">
        <AccordionItem value="basic-settings">
          <AccordionTrigger>Basic Settings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resolution">Resolution</Label>
                    <Select 
                      value={browserConfig.resolution} 
                      onValueChange={(value) => updateConfig('resolution', value)}
                      disabled={isProcessing}
                    >
                      <SelectTrigger id="resolution">
                        <SelectValue placeholder="Select resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1366x768">1366 x 768 (Laptop)</SelectItem>
                        <SelectItem value="1920x1080">1920 x 1080 (FHD)</SelectItem>
                        <SelectItem value="2560x1440">2560 x 1440 (QHD)</SelectItem>
                        <SelectItem value="3840x2160">3840 x 2160 (4K)</SelectItem>
                        <SelectItem value="375x812">375 x 812 (Mobile)</SelectItem>
                        <SelectItem value="768x1024">768 x 1024 (Tablet)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select 
                      value={browserConfig.theme || "Ocean"} 
                      onValueChange={(value) => updateConfig('theme', value)}
                      disabled={isProcessing}
                    >
                      <SelectTrigger id="theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ocean">Ocean</SelectItem>
                        <SelectItem value="Forest">Forest</SelectItem>
                        <SelectItem value="Desert">Desert</SelectItem>
                        <SelectItem value="Space">Space</SelectItem>
                        <SelectItem value="Default">Default</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="darkMode"
                    checked={browserConfig.darkMode || false}
                    onCheckedChange={(checked) => updateConfig('darkMode', checked)}
                    disabled={isProcessing}
                  />
                  <Label htmlFor="darkMode">Dark Mode</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="persistentSession"
                    checked={browserConfig.persistentSession}
                    onCheckedChange={(checked) => updateConfig('persistentSession', checked)}
                    disabled={isProcessing}
                  />
                  <Label htmlFor="persistentSession">Persistent Session</Label>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="advanced-settings">
          <AccordionTrigger>Advanced Settings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="headless"
                  checked={browserConfig.headless || false}
                  onCheckedChange={(checked) => updateConfig('headless', checked)}
                  disabled={isProcessing}
                />
                <Label htmlFor="headless">Headless Mode</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="disableSecurity"
                  checked={browserConfig.disableSecurity || false}
                  onCheckedChange={(checked) => updateConfig('disableSecurity', checked)}
                  disabled={isProcessing}
                />
                <Label htmlFor="disableSecurity">Disable Security Restrictions</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="useOwnBrowser"
                  checked={browserConfig.useOwnBrowser}
                  onCheckedChange={(checked) => updateConfig('useOwnBrowser', checked)}
                  disabled={isProcessing}
                />
                <Label htmlFor="useOwnBrowser">Use Own Browser (Experimental)</Label>
              </div>
              
              {browserConfig.useOwnBrowser && (
                <div>
                  <Label htmlFor="chromePath">Chrome Executable Path</Label>
                  <Input
                    id="chromePath"
                    placeholder="/usr/bin/chromium"
                    value={browserConfig.chromePath || ''}
                    onChange={(e) => updateConfig('chromePath', e.target.value)}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Path to Chrome/Chromium executable
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="extraChromiumArgs">Extra Browser Arguments</Label>
                <Input
                  id="extraChromiumArgs"
                  placeholder="--disable-web-security --no-sandbox"
                  value={browserConfig.extraChromiumArgs?.join(' ') || ''}
                  onChange={(e) => updateConfig('extraChromiumArgs', e.target.value.split(' ').filter(arg => arg.trim() !== ''))}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate arguments with spaces
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="context-settings">
          <AccordionTrigger>Context Settings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div>
                <Label>Page Load Timing</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="minWaitPageLoadTime" className="text-xs">Min Wait Time (s)</Label>
                    <Input
                      id="minWaitPageLoadTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={browserConfig.contextConfig?.minWaitPageLoadTime || 0.5}
                      onChange={(e) => updateContextConfig('minWaitPageLoadTime', parseNumber(e.target.value))}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="waitForNetworkIdlePageLoadTime" className="text-xs">Network Idle Wait (s)</Label>
                    <Input
                      id="waitForNetworkIdlePageLoadTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={browserConfig.contextConfig?.waitForNetworkIdlePageLoadTime || 5.0}
                      onChange={(e) => updateContextConfig('waitForNetworkIdlePageLoadTime', parseNumber(e.target.value))}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxWaitPageLoadTime" className="text-xs">Max Wait Time (s)</Label>
                    <Input
                      id="maxWaitPageLoadTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={browserConfig.contextConfig?.maxWaitPageLoadTime || 15.0}
                      onChange={(e) => updateContextConfig('maxWaitPageLoadTime', parseNumber(e.target.value))}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label>Browser Appearance</Label>
                <div className="space-y-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="highlightElements"
                      checked={browserConfig.contextConfig?.highlightElements !== false}
                      onCheckedChange={(checked) => updateContextConfig('highlightElements', checked)}
                      disabled={isProcessing}
                    />
                    <Label htmlFor="highlightElements">Highlight Elements</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="viewportExpansion">Viewport Expansion</Label>
                    <Input
                      id="viewportExpansion"
                      type="number"
                      value={browserConfig.contextConfig?.viewportExpansion || 500}
                      onChange={(e) => updateContextConfig('viewportExpansion', parseNumber(e.target.value))}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Extra space added to the bottom of the viewport (in pixels)
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label>Browser Identity</Label>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label htmlFor="userAgent">User Agent</Label>
                    <Input
                      id="userAgent"
                      placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
                      value={browserConfig.contextConfig?.userAgent || ''}
                      onChange={(e) => updateContextConfig('userAgent', e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="locale">Locale</Label>
                    <Input
                      id="locale"
                      placeholder="en-US"
                      value={browserConfig.contextConfig?.locale || ''}
                      onChange={(e) => updateContextConfig('locale', e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label htmlFor="allowedDomains">Allowed Domains</Label>
                <Input
                  id="allowedDomains"
                  placeholder="example.com, subdomain.example.org"
                  value={Array.isArray(browserConfig.contextConfig?.allowedDomains) 
                    ? browserConfig.contextConfig?.allowedDomains.join(', ') 
                    : browserConfig.contextConfig?.allowedDomains || ''}
                  onChange={(e) => {
                    const domains = e.target.value
                      .split(',')
                      .map(d => d.trim())
                      .filter(d => d !== '');
                    updateContextConfig('allowedDomains', domains.length > 0 ? domains : undefined);
                  }}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated list of domains that the browser is allowed to visit (leave empty for no restrictions)
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
