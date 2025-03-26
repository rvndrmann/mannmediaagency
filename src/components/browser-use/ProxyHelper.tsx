
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, AlertCircle, Globe, Lock, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProxyHelperProps {
  proxyUrl: string;
  onProxyUrlChange: (url: string) => void;
  isProcessing?: boolean;
}

const PROXY_EXAMPLES = [
  {
    name: "HTTP Proxy",
    format: "http://username:password@proxy.example.com:8080",
    description: "Standard HTTP proxy with authentication"
  },
  {
    name: "HTTPS Proxy",
    format: "https://proxy.example.com:8080",
    description: "Secure HTTPS proxy without authentication"
  },
  {
    name: "SOCKS5 Proxy",
    format: "socks5://username:password@proxy.example.com:1080",
    description: "SOCKS5 proxy with authentication"
  },
  {
    name: "IP Authentication",
    format: "http://proxy.example.com:8080",
    description: "Proxy that authenticates by IP address (no credentials needed)"
  }
];

const PROXY_PRESETS = [
  {
    name: "U.S. Geolocation",
    description: "Access content as if browsing from the United States",
    value: "custom:us"
  },
  {
    name: "EU Geolocation",
    description: "Access content as if browsing from Europe",
    value: "custom:eu"
  },
  {
    name: "Anonymous Browsing",
    description: "Maximum anonymity configuration",
    value: "custom:anon"
  },
  {
    name: "Web Scraping Optimized",
    description: "Configured for reliable web scraping",
    value: "custom:scrape"
  }
];

const TROUBLESHOOTING_TIPS = [
  "If connection fails, verify your proxy credentials are correct",
  "Some websites detect and block proxy connections; try a different proxy provider",
  "For HTTPS sites, ensure your proxy supports secure connections",
  "If you're getting SSL errors, your proxy might be intercepting the connection",
  "Rotating proxies can help avoid rate limiting or IP blocks during scraping",
  "Check if the proxy has bandwidth limitations that might be affecting performance"
];

export function ProxyHelper({ proxyUrl, onProxyUrlChange, isProcessing = false }: ProxyHelperProps) {
  const [testUrl, setTestUrl] = useState("https://httpbin.org/ip");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("examples");

  const handleApplyExample = (example: string) => {
    onProxyUrlChange(example);
  };

  const handleSelectPreset = (preset: string) => {
    // In a real implementation, these would be actual proxy URLs
    // This is just a placeholder for the UI demonstration
    const presetMap: Record<string, string> = {
      "custom:us": "http://us-proxy-example.com:8080",
      "custom:eu": "http://eu-proxy-example.com:8080",
      "custom:anon": "socks5://anonymous-proxy-example.com:1080",
      "custom:scrape": "http://scraping-proxy-example.com:8080"
    };
    
    onProxyUrlChange(presetMap[preset] || "");
    toast.info("Preset applied. Remember to replace with your actual proxy details.");
  };

  const testProxy = async () => {
    if (!proxyUrl) {
      toast.error("Please enter a proxy URL first");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("browser-use-api", {
        body: { 
          action: "test-proxy",
          proxyUrl,
          testUrl
        }
      });
      
      if (error) throw error;
      
      setTestResult({
        success: data.success,
        message: data.message,
        data: data.data
      });
      
      if (data.success) {
        toast.success("Proxy test successful");
      } else {
        toast.error(`Proxy test failed: ${data.message}`);
      }
    } catch (error) {
      console.error("Error testing proxy:", error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
      toast.error("Failed to test proxy");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h3 className="text-lg font-medium flex items-center">
          Proxy Configuration
          {proxyUrl && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" /> Active
            </Badge>
          )}
        </h3>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="proxyUrl">Proxy URL</Label>
          <div className="flex space-x-2">
            <Input
              id="proxyUrl"
              value={proxyUrl}
              onChange={(e) => onProxyUrlChange(e.target.value)}
              placeholder="http://username:password@proxy.example.com:8080"
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              onClick={testProxy} 
              disabled={isTesting || isProcessing || !proxyUrl}
              variant="outline"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing
                </>
              ) : (
                "Test Proxy"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the complete proxy URL including protocol, authentication (if required), and port
          </p>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            {testResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              <div className="font-medium">{testResult.message}</div>
              {testResult.data && (
                <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-auto max-h-[100px]">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="testUrl">Test URL</Label>
          <Input
            id="testUrl"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://httpbin.org/ip"
            disabled={isTesting || isProcessing}
          />
          <p className="text-xs text-muted-foreground">
            URL to use for testing proxy connection (default checks your apparent IP address)
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-2">
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="help">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="examples" className="space-y-3">
          <div className="text-sm">
            <p className="mb-2">Use proxies for:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Accessing region-restricted content</li>
              <li>Web scraping with rotating IPs to avoid rate limits</li>
              <li>Anonymizing your traffic</li>
              <li>Testing website behavior from different locations</li>
            </ul>
          </div>

          <div className="grid gap-2">
            {PROXY_EXAMPLES.map((example, index) => (
              <Card key={index} className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm">{example.name}</h4>
                    <p className="text-xs text-muted-foreground">{example.description}</p>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 block">
                      {example.format}
                    </code>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => handleApplyExample(example.format)}
                  >
                    Apply
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="presets" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select a preset configuration for common proxy scenarios. 
            These are example configurations - you'll need to replace with your actual proxy details.
          </p>

          <div className="space-y-2">
            <Label htmlFor="presetSelector">Proxy Preset</Label>
            <Select onValueChange={handleSelectPreset}>
              <SelectTrigger id="presetSelector">
                <SelectValue placeholder="Select a preset configuration" />
              </SelectTrigger>
              <SelectContent>
                {PROXY_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <div className="flex items-center">
                      {preset.value.includes('us') && <Globe className="h-4 w-4 mr-2 text-blue-500" />}
                      {preset.value.includes('eu') && <Globe className="h-4 w-4 mr-2 text-yellow-500" />}
                      {preset.value.includes('anon') && <Lock className="h-4 w-4 mr-2 text-green-500" />}
                      {preset.value.includes('scrape') && <ExternalLink className="h-4 w-4 mr-2 text-purple-500" />}
                      <span>{preset.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            {PROXY_PRESETS.map((preset, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center gap-2">
                  {preset.value.includes('us') && <Globe className="h-4 w-4 text-blue-500 shrink-0" />}
                  {preset.value.includes('eu') && <Globe className="h-4 w-4 text-yellow-500 shrink-0" />}
                  {preset.value.includes('anon') && <Lock className="h-4 w-4 text-green-500 shrink-0" />}
                  {preset.value.includes('scrape') && <ExternalLink className="h-4 w-4 text-purple-500 shrink-0" />}
                  <div>
                    <h4 className="font-medium text-sm">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="help" className="space-y-3">
          <div className="space-y-3">
            <h4 className="font-medium">Troubleshooting Tips</h4>
            <ul className="space-y-2">
              {TROUBLESHOOTING_TIPS.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 p-3 bg-slate-50 rounded-md border">
              <h4 className="font-medium text-sm mb-2">Common Proxy Formats</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">HTTP:</span>
                  <code className="ml-2 text-xs bg-slate-100 px-1 py-0.5 rounded">http://username:password@host:port</code>
                </div>
                <div>
                  <span className="font-medium">HTTPS:</span>
                  <code className="ml-2 text-xs bg-slate-100 px-1 py-0.5 rounded">https://username:password@host:port</code>
                </div>
                <div>
                  <span className="font-medium">SOCKS4:</span>
                  <code className="ml-2 text-xs bg-slate-100 px-1 py-0.5 rounded">socks4://username:password@host:port</code>
                </div>
                <div>
                  <span className="font-medium">SOCKS5:</span>
                  <code className="ml-2 text-xs bg-slate-100 px-1 py-0.5 rounded">socks5://username:password@host:port</code>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
