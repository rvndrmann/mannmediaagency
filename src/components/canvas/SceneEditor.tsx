
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
  Info
} from "lucide-react";
import { useState } from "react";

interface SceneEditorProps {
  scene: CanvasScene;
  onUpdate: (id: string, type: "script" | "imagePrompt" | "description" | "image" | "productImage" | "video" | "voiceOver" | "backgroundMusic", value: string) => Promise<void>;
}

export function SceneEditor({ scene, onUpdate }: SceneEditorProps) {
  const [script, setScript] = useState(scene.script || "");
  const [description, setDescription] = useState(scene.description || "");
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt || "");
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);
  const [isUpdatingImagePrompt, setIsUpdatingImagePrompt] = useState(false);
  
  const handleSaveScript = async () => {
    setIsUpdatingScript(true);
    try {
      await onUpdate(scene.id, "script", script);
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
        <TabsList className="grid grid-cols-4 gap-4">
          <TabsTrigger value="script" className="flex items-center">
            <Heading className="h-4 w-4 mr-2" />
            Script
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
            <Button 
              onClick={handleSaveScript}
              disabled={isUpdatingScript}
            >
              {isUpdatingScript ? "Saving..." : "Save Script"}
            </Button>
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
