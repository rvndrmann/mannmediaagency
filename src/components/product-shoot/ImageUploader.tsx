
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedImagesGrid } from "./SavedImagesGrid";
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
  const queryClient = useQueryClient();

  const saveImage = useMutation({
    mutationFn: async () => {
      if (!previewUrl) throw new Error("No image to save");

      try {
        // Get the user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Fetch the blob from the preview URL
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        const filename = `${crypto.randomUUID()}.${blob.type.split('/')[1]}`;

        // Upload to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from("saved_product_images")
          .upload(filename, blob);

        if (storageError) throw storageError;

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

        if (dbError) throw dbError;

        return publicUrl;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Image saved successfully");
      queryClient.invalidateQueries({ queryKey: ["saved-product-images"] });
      setActiveTab("saved"); // Switch to saved images tab after saving
    },
    onError: () => {
      toast.error("Failed to save image");
    },
  });

  const handleImageSelect = (imageUrl: string) => {
    // Create a new Image to load it
    const img = new Image();
    img.crossOrigin = "anonymous"; // Add this to handle CORS
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
            // Create a mock file and event
            const file = new File([blob], "selected-image.jpg", { type: "image/jpeg" });
            const mockEvent = {
              target: {
                files: [file]
              }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            
            onFileSelect(mockEvent);
            const url = URL.createObjectURL(blob);
            window.dispatchEvent(new CustomEvent('set-preview-url', { detail: url }));
          }
        }, 'image/jpeg');
      }
    };
    setActiveTab("upload");
  };

  return (
    <div className="space-y-2">
      <Label className="text-white">Upload Image</Label>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="saved">Saved Images</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-4">
          <div className="relative">
            {!previewUrl ? (
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-400">Drop an image or click to upload</p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70"
                    onClick={() => saveImage.mutate()}
                  >
                    <Save className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70"
                    onClick={onClear}
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
      </Tabs>
    </div>
  );
}
