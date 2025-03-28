
import { CanvasScene } from "@/types/canvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Heading, 
  ImageIcon, 
  FileVideo,
  Music,
  Mic,
  Info,
  Volume2
} from "lucide-react";
import { useState, useEffect } from "react";

interface SceneEditorProps {
  scene: CanvasScene;
  onUpdate: (id: string, type: "script" | "imagePrompt" | "description" | "image" | "productImage" | "video" | "voiceOver" | "voiceOverText" | "backgroundMusic", value: string) => Promise<void>;
}

export function SceneEditor({ scene, onUpdate }: SceneEditorProps) {
  const [script, setScript] = useState(scene.script || "");
  const [description, setDescription] = useState(scene.description || "");
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt || "");
  const [voiceOverText, setVoiceOverText] = useState(scene.voiceOverText || "");
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);
  const [isUpdatingImagePrompt, setIsUpdatingImagePrompt] = useState(false);
  const [isUpdatingVoiceOverText, setIsUpdatingVoiceOverText] = useState(false);
  
  // Update local state when scene prop changes
  useEffect(() => {
    setScript(scene.script || "");
    setDescription(scene.description || "");
    setImagePrompt(scene.imagePrompt || "");
    setVoiceOverText(scene.voiceOverText || "");
  }, [scene]);
  
  const handleSaveScript = async () => {
    setIsUpdatingScript(true);
    try {
      await onUpdate(scene.id, "script", script);
      
      // Extract voice-over text from script if none exists
      if (!voiceOverText) {
        const extractedText = extractVoiceOverText(script);
        if (extractedText) {
          setVoiceOverText(extractedText);
          await onUpdate(scene.id, "voiceOverText", extractedText);
        }
      }
    } finally {
      setIsUpdatingScript(false);
    }
  };
  
  const handleSaveDescription = async () => {
    setIsUpdatingDescription(true);
    try {
      await onUpdate(scene.id, "description", description);
    } finally {
      setIsUpdatingDescription(false);
    }
  };
  
  const handleSaveImagePrompt = async () => {
    setIsUpdatingImagePrompt(true);
    try {
      await onUpdate(scene.id, "imagePrompt", imagePrompt);
    } finally {
      setIsUpdatingImagePrompt(false);
    }
  };
  
  const handleSaveVoiceOverText = async () => {
    setIsUpdatingVoiceOverText(true);
    try {
      await onUpdate(scene.id, "voiceOverText", voiceOverText);
    } finally {
      setIsUpdatingVoiceOverText(false);
    }
  };
  
  // Helper function to extract clean voice-over text from script content
  const extractVoiceOverText = (content: string): string => {
    // Strip any bracketed direction text [like this]
    let voiceOverText = content.replace(/\[.*?\]/g, '');
    
    // Remove any narrator directions in parentheses (like this)
    voiceOverText = voiceOverText.replace(/\(.*?\)/g, '');
    
    // Remove any lines that start with common direction markers
    const lines = voiceOverText.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return !trimmedLine.startsWith('SCENE') &&
             !trimmedLine.startsWith('CUT TO:') &&
             !trimmedLine.startsWith('FADE') &&
             !trimmedLine.startsWith('INT.') &&
             !trimmedLine.startsWith('EXT.') &&
             !trimmedLine.startsWith('TRANSITION');
    });
    
    // Clean up any double spaces or excess whitespace
    return lines.join('\n').replace(/\s+/g, ' ').trim();
  };
  
  const extractVoiceOverFromScript = () => {
    const extractedText = extractVoiceOverText(script);
    setVoiceOverText(extractedText);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">
          {scene.title || "Scene Editor"}
        </h2>
        <div className="text-sm text-muted-foreground">
          Scene ID: {scene.id.substring(0, 8)}...
        </div>
      </div>
      
      <Tabs defaultValue="script" className="space-y-4">
        <TabsList className="grid grid-cols-5 gap-4">
          <TabsTrigger value="script" className="flex items-center">
            <Heading className="h-4 w-4 mr-2" />
            Script
          </TabsTrigger>
          <TabsTrigger value="voiceover" className="flex items-center">
            <Volume2 className="h-4 w-4 mr-2" />
            Voice Over
          </TabsTrigger>
          <TabsTrigger value="visuals" className="flex items-center">
            <ImageIcon className="h-4 w-4 mr-2" />
            Visuals
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center">
            <FileVideo className="h-4 w-4 mr-2" />
            Media
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="script" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="script">Scene Script</Label>
            <Textarea 
              id="script" 
              value={script} 
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter the script for this scene..."
              className="min-h-32"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveScript}
                disabled={isUpdatingScript}
              >
                {isUpdatingScript ? "Saving..." : "Save Script"}
              </Button>
              <Button
                variant="outline"
                onClick={extractVoiceOverFromScript}
              >
                Extract Voice Over Text
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="voiceover" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voiceOverText">Voice Over Text</Label>
            <p className="text-xs text-muted-foreground mb-1">
              This is the clean text that will be used for voice-over generation, without any direction notes or scene descriptions.
            </p>
            <Textarea 
              id="voiceOverText" 
              value={voiceOverText} 
              onChange={(e) => setVoiceOverText(e.target.value)}
              placeholder="Enter the voice-over text for this scene..."
              className="min-h-32"
            />
            <Button 
              onClick={handleSaveVoiceOverText}
              disabled={isUpdatingVoiceOverText}
            >
              {isUpdatingVoiceOverText ? "Saving..." : "Save Voice Over Text"}
            </Button>
            
            {scene.voiceOverUrl && (
              <div className="mt-4">
                <Label>Current Voice Over</Label>
                <div className="mt-2 border rounded-md p-4">
                  <audio 
                    controls 
                    className="w-full"
                    src={scene.voiceOverUrl}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="visuals" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imagePrompt">Image Generation Prompt</Label>
            <Textarea 
              id="imagePrompt" 
              value={imagePrompt} 
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Enter a detailed prompt to generate an image for this scene..."
              className="min-h-32"
            />
            <Button 
              onClick={handleSaveImagePrompt}
              disabled={isUpdatingImagePrompt}
            >
              {isUpdatingImagePrompt ? "Saving..." : "Save Image Prompt"}
            </Button>
          </div>
          
          {scene.imageUrl && (
            <div className="mt-4">
              <Label>Generated Image</Label>
              <div className="mt-2 border rounded-md overflow-hidden">
                <img 
                  src={scene.imageUrl} 
                  alt="Scene visualization" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="media" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Voice Over</Label>
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center">
                <Mic className="h-8 w-8 mb-2" />
                <span>Add Voice Over</span>
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Background Music</Label>
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center">
                <Music className="h-8 w-8 mb-2" />
                <span>Add Background Music</span>
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Scene Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter additional details or notes about this scene..."
              className="min-h-32"
            />
            <Button 
              onClick={handleSaveDescription}
              disabled={isUpdatingDescription}
            >
              {isUpdatingDescription ? "Saving..." : "Save Description"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
