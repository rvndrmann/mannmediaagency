
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrowserConfig, BrowserTheme } from "@/hooks/browser-use/types";
import { Monitor, Moon, Sun, Palette, Laptop2 } from "lucide-react";

interface BrowserSettingsProps {
  config: BrowserConfig;
  onConfigChange: (config: BrowserConfig) => void;
}

export function BrowserSettings({ config, onConfigChange }: BrowserSettingsProps) {
  const handleConfigChange = <K extends keyof BrowserConfig>(key: K, value: BrowserConfig[K]) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  const themes: BrowserTheme[] = ['Default', 'Soft', 'Monochrome', 'Glass', 'Origin', 'Citrus', 'Ocean'];

  return (
    <Card className="p-4 space-y-4">
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
            <Label htmlFor="own-browser" className="cursor-pointer">Use Own Browser</Label>
          </div>
          <Switch
            id="own-browser"
            checked={config.useOwnBrowser}
            onCheckedChange={(checked) => handleConfigChange('useOwnBrowser', checked)}
          />
        </div>

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
    </Card>
  );
}
