
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedImagesGrid } from "../product-shoot/SavedImagesGrid";
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
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save image");
    },
  });

  const handleImageSelect = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      
      const blob = await response.blob();
      const file = new File([blob], "selected-image.jpg", { type: "image/jpeg" });
      
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      onFileSelect(mockEvent);
      setActiveTab("upload");
    } catch (error) {
      toast.error("Failed to load image");
    }
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
                    disabled={isUploading}
                  >
                    <Save className="h-4 w-4 text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70"
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
      </Tabs>
    </div>
  );
}
