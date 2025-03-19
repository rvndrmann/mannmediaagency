
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrowserConfig } from "@/hooks/browser-use/types";
import { Separator } from "@/components/ui/separator";

interface BrowserConfigPanelProps {
  config: BrowserConfig;
  setConfig: (config: BrowserConfig) => void;
  disabled?: boolean;
}

export function BrowserConfigPanel({ config, setConfig, disabled = false }: BrowserConfigPanelProps) {
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

  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-4">Browser Configuration</h3>
      
      <div className="space-y-6">
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
        
        <Separator />
        
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Advanced Settings</h4>
          
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
        </div>
      </div>
    </Card>
  );
}
