
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedImagesGrid } from "./SavedImagesGrid";
import { DefaultImagesGrid } from "./DefaultImagesGrid";
import { SaveAsDefaultButton } from "./SaveAsDefaultButton";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ImageUploaderProps {
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

export function ImageUploader({ previewUrl, onFileSelect, onClear }: ImageUploaderProps) {
  const [activeTab, setActiveTab] = useState("upload");
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const saveImage = useMutation({
    mutationFn: async () => {
      if (!previewUrl) {
        throw new Error("No image to save");
      }

      setIsUploading(true);
      try {
        // Get the user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error("Authentication error: " + userError.message);
        if (!user) throw new Error("User not authenticated");

        // Fetch the blob from the preview URL
        const response = await fetch(previewUrl);
        if (!response.ok) throw new Error("Failed to fetch image data");
        
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error("Invalid file type - must be an image");
        }

        const fileExt = blob.type.split('/')[1] || 'png';
        const filename = `${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: storageError } = await supabase.storage
          .from("saved_product_images")
          .upload(filename, blob, {
            contentType: blob.type,
            upsert: false
          });

        if (storageError) {
          console.error("Storage error:", storageError);
          throw new Error("Failed to upload image to storage");
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from("saved_product_images")
          .getPublicUrl(filename);

        // Save to database
        const { error: dbError } = await supabase
          .from("saved_product_images")
          .insert({
            user_id: user.id,
            original_filename: filename,
            storage_path: filename,
            image_url: publicUrl
          });

        if (dbError) {
          console.error("Database error:", dbError);
          throw new Error("Failed to save image metadata");
        }

        return publicUrl;
      } catch (error) {
        console.error("Save image error:", error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast.success("Image saved successfully");
      queryClient.invalidateQueries({ queryKey: ["saved-product-images"] });
      setActiveTab("saved");
      onClear(); // Clear the preview after successful save
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save image");
    },
  });

  const handleImageSelect = (imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "selected-image.jpg", { type: "image/jpeg" });
            const mockEvent = {
              target: {
                files: [file]
              }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            
            onFileSelect(mockEvent);
          }
        }, 'image/jpeg');
      }
    };

    img.onerror = () => {
      toast.error("Failed to load image");
    };

    setActiveTab("upload");
  };

  const refreshCachedImages = () => {
    queryClient.invalidateQueries({ queryKey: ["saved-product-images"] });
    queryClient.invalidateQueries({ queryKey: ["defaultProductImages"] });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-white mb-2">Upload Image</Label>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 p-1">
          <TabsTrigger 
            value="upload"
            className="data-[state=active]:bg-purple-500 text-white data-[state=active]:text-white"
          >
            Upload
          </TabsTrigger>
          <TabsTrigger 
            value="saved"
            className="data-[state=active]:bg-purple-500 text-white data-[state=active]:text-white"
          >
            Saved Images
          </TabsTrigger>
          <TabsTrigger 
            value="defaults"
            className="data-[state=active]:bg-purple-500 text-white data-[state=active]:text-white"
          >
            Default Images
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-4">
          <div className="relative">
            {!previewUrl ? (
              <div className="border-2 border-dashed border-white/20 hover:border-purple-500/50 transition-colors rounded-lg bg-white/5">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="p-8 text-center">
                  <Upload className="mx-auto h-10 w-10 text-white/40 mb-4" />
                  <p className="text-sm text-white/80 font-medium mb-1">Drop an image or click to upload</p>
                  <p className="text-xs text-white/40">Supports JPG, PNG - Max 5MB</p>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg border border-white/10"
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <SaveAsDefaultButton 
                    imageUrl={previewUrl} 
                    onSaved={refreshCachedImages}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                    onClick={() => saveImage.mutate()}
                    disabled={isUploading}
                  >
                    <Save className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                    onClick={onClear}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="saved" className="mt-4">
          <SavedImagesGrid onSelect={handleImageSelect} />
        </TabsContent>
        <TabsContent value="defaults" className="mt-4">
          <DefaultImagesGrid onSelect={handleImageSelect} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
