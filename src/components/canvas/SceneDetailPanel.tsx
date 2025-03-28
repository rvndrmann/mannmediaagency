
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PanelRight, 
  ChevronRight, 
  Wand2, 
  ImageIcon,
  Upload,
  Trash2,
  Video
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadFileToBucket } from "@/utils/supabase-helpers";

interface SceneDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video', value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function SceneDetailPanel({
  scene,
  projectId,
  updateScene,
  collapsed,
  setCollapsed,
}: SceneDetailPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateImagePrompt = async () => {
    if (!scene || !scene.voiceOverText) {
      toast.error("Voice-over text is required to generate an image prompt");
      return;
    }

    try {
      setIsGenerating(true);
      toast.loading("Generating image prompt...");

      // Call the generate-image-prompts function
      const { data, error } = await supabase.functions.invoke('generate-image-prompts', {
        body: { 
          sceneIds: [scene.id],
          projectId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.dismiss();
      
      if (data.successfulScenes > 0) {
        toast.success("Image prompt generated successfully");
      } else {
        toast.error("Failed to generate image prompt");
      }
      
    } catch (err: any) {
      console.error("Error generating image prompt:", err);
      toast.dismiss();
      toast.error(err.message || "Failed to generate image prompt");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProductImageUpload = () => {
    if (!scene) return;
    if (productImageInputRef.current) {
      productImageInputRef.current.click();
    }
  };

  const handleProductImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!scene) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("Uploading product image...");
      
      const publicUrl = await uploadFileToBucket('product-images', file);
      
      if (!publicUrl) {
        throw new Error("Failed to upload image");
      }
      
      await updateScene(scene.id, 'productImage', publicUrl);
      
      toast.dismiss();
      toast.success("Product image uploaded successfully");
      
      // Reset the file input
      if (e.target) e.target.value = '';
      
    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.dismiss();
      toast.error("Failed to upload product image");
    }
  };

  const handleRemoveProductImage = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'productImage', '');
      toast.success("Product image removed");
    } catch (error) {
      console.error("Error removing product image:", error);
      toast.error("Failed to remove product image");
    }
  };
  
  const handleVideoUpload = () => {
    if (!scene) return;
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const handleVideoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!scene) return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if the file is a video format
    if (!file.type.startsWith('video/')) {
      toast.error("Please select a video file");
      return;
    }

    try {
      toast.loading("Uploading video...");
      
      const publicUrl = await uploadFileToBucket('scene-videos', file);
      
      if (!publicUrl) {
        throw new Error("Failed to upload video");
      }
      
      await updateScene(scene.id, 'video', publicUrl);
      
      toast.dismiss();
      toast.success("Video uploaded successfully");
      
      // Reset the file input
      if (e.target) e.target.value = '';
      
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.dismiss();
      toast.error("Failed to upload video");
    }
  };

  const handleRemoveVideo = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'video', '');
      toast.success("Video removed");
    } catch (error) {
      console.error("Error removing video:", error);
      toast.error("Failed to remove video");
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-900">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="w-80 border-l bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-muted-foreground">Select a scene to see details</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          className="absolute right-2 top-2"
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-slate-50 dark:bg-slate-900 flex flex-col relative h-full">
      <div className="p-4 border-b bg-background flex justify-between items-center">
        <h3 className="font-medium">Scene Options</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium">AI Generation</h4>
            <p className="text-sm text-muted-foreground">
              Generate content for this scene using AI
            </p>
            <Button
              onClick={handleGenerateImagePrompt}
              disabled={isGenerating || !scene.voiceOverText}
              className="w-full"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Image Prompt
            </Button>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Product Image</h4>
            <p className="text-sm text-muted-foreground">
              Upload a product image to be used in this scene
            </p>
            
            <input
              type="file"
              ref={productImageInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleProductImageSelected}
            />
            
            {scene.productImageUrl ? (
              <div className="relative">
                <img 
                  src={scene.productImageUrl} 
                  alt="Product" 
                  className="w-full h-auto rounded-md border border-border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveProductImage}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleProductImageUpload}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Product Image
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Scene Video</h4>
            <p className="text-sm text-muted-foreground">
              Upload a video for this scene
            </p>
            
            <input
              type="file"
              ref={videoInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleVideoSelected}
            />
            
            {scene.videoUrl ? (
              <div className="space-y-2">
                <video 
                  src={scene.videoUrl} 
                  controls
                  className="w-full h-auto rounded-md border border-border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveVideo}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Video
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleVideoUpload}
                className="w-full"
              >
                <Video className="mr-2 h-4 w-4" />
                Upload Scene Video
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
