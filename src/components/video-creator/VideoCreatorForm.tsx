
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { FileUploader } from "./FileUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkApiKeyStatus } from "@/services/json2videoService";

interface VideoCreatorFormProps {
  onCreateVideo: (jsonData: any) => Promise<void>;
  isLoading: boolean;
  apiKeyMissing?: boolean;
}

export function VideoCreatorForm({ 
  onCreateVideo, 
  isLoading, 
  apiKeyMissing = false 
}: VideoCreatorFormProps) {
  const [resolution, setResolution] = useState<string>("full-hd");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [jsonConfig, setJsonConfig] = useState<string>("");
  const [useCustomJson, setUseCustomJson] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState<boolean>(true);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        setIsCheckingApiKey(true);
        setApiKeyError(null);
        const status = await checkApiKeyStatus();
        setIsApiKeyValid(status.success);
        if (!status.success) {
          const errorMsg = status.message || 'API key validation failed';
          console.error('API key validation failed:', errorMsg);
          setApiKeyError(errorMsg);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('API key validation error:', errorMsg);
        setIsApiKeyValid(false);
        setApiKeyError(errorMsg);
      } finally {
        setIsCheckingApiKey(false);
      }
    };

    checkApiKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (apiKeyMissing || !isApiKeyValid) {
      toast.error("JSON2Video API key is not configured or invalid.");
      return;
    }
    
    try {
      let jsonData;
      
      if (useCustomJson) {
        try {
          jsonData = JSON.parse(jsonConfig);
        } catch (error) {
          toast.error("Invalid JSON configuration");
          return;
        }
      } else {
        jsonData = {
          "resolution": resolution,
          "scenes": [
            {
              "elements": [
                {
                  "type": "video",
                  "src": videoUrl
                }
              ]
            }
          ]
        };

        if (audioUrl) {
          jsonData.scenes[0].elements.push({
            "type": "audio",
            "src": audioUrl,
            "volume": 1
          });
        }
      }
      
      if ((!useCustomJson && !videoUrl) || (useCustomJson && !jsonConfig)) {
        toast.error("Please provide a video URL or custom JSON configuration");
        return;
      }
      
      await onCreateVideo(jsonData);
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Failed to create video");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Create Video
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {isCheckingApiKey ? (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Checking API Key</AlertTitle>
              <AlertDescription>
                Verifying the JSON2Video API key configuration...
              </AlertDescription>
            </Alert>
          ) : (apiKeyMissing || !isApiKeyValid) ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>API Key Error</AlertTitle>
              <AlertDescription>
                {apiKeyError ? (
                  <>
                    Error: {apiKeyError}. Please check your Supabase Edge Function secrets.
                  </>
                ) : (
                  <>
                    The JSON2Video API key is not configured or is invalid. Please check your Supabase Edge Function secrets.
                  </>
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          
          <div className="space-y-1">
            <Label 
              htmlFor="json-toggle" 
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                id="json-toggle"
                type="checkbox"
                className="form-checkbox h-4 w-4 text-primary focus:ring-primary"
                checked={useCustomJson}
                onChange={() => setUseCustomJson(!useCustomJson)}
              />
              <span>Use custom JSON configuration</span>
            </Label>
          </div>
          
          {useCustomJson ? (
            <div className="space-y-2">
              <Label htmlFor="json-config">Custom JSON Configuration</Label>
              <Textarea
                id="json-config"
                className="min-h-[200px] font-mono"
                placeholder='{"resolution": "full-hd", "scenes": [...]}'
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Select 
                  value={resolution} 
                  onValueChange={setResolution}
                >
                  <SelectTrigger id="resolution">
                    <SelectValue placeholder="Select a resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-hd">Full HD (1080p)</SelectItem>
                    <SelectItem value="hd">HD (720p)</SelectItem>
                    <SelectItem value="sd">SD (480p)</SelectItem>
                    <SelectItem value="4k">4K (2160p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as "url" | "upload")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="url">URL Input</TabsTrigger>
                  <TabsTrigger value="upload">File Upload</TabsTrigger>
                </TabsList>
                
                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video-url">Video URL</Label>
                    <Input
                      id="video-url"
                      placeholder="https://example.com/video.mp4"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter a publicly accessible URL to your video file
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="audio-url">Background Audio URL (Optional)</Label>
                    <Input
                      id="audio-url"
                      placeholder="https://example.com/audio.mp3"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video-file">Video File</Label>
                    <FileUploader
                      label="Video"
                      accept="video/*"
                      onFileUploaded={setVideoUrl}
                      buttonText="Upload Video"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="audio-file">Background Audio (Optional)</Label>
                    <FileUploader
                      label="Audio"
                      accept="audio/*"
                      onFileUploaded={setAudioUrl}
                      buttonText="Upload Audio"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full"
            disabled={
              isLoading || 
              isCheckingApiKey ||
              apiKeyMissing || 
              !isApiKeyValid ||
              ((!useCustomJson && inputMode === "url" && !videoUrl) || 
               (!useCustomJson && inputMode === "upload" && !videoUrl) || 
               (useCustomJson && !jsonConfig))
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Video...
              </>
            ) : (
              "Create Video"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
