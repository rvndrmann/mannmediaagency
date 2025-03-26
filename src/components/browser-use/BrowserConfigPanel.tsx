import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrowserConfig, DesktopApplication } from "@/hooks/browser-use/types";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Laptop, Plus, Trash2, Bookmark, Terminal } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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

  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-4">Browser & Desktop Configuration</h3>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
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
            
            {config.useOwnBrowser && (
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
        </TabsContent>
      </Tabs>
    </Card>
  );
}
