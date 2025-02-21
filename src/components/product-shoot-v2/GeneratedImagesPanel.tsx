
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SavedImagesGrid } from "@/components/product-shoot/SavedImagesGrid";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface GeneratedImage {
  url: string;
  content_type: string;
}

interface GeneratedImagesPanelProps {
  images: GeneratedImage[];
  isGenerating: boolean;
}

export function GeneratedImagesPanel({ images, isGenerating }: GeneratedImagesPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("generated");

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `product-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const handleSaveImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Get the user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to save images");
        return;
      }

      const filename = `${crypto.randomUUID()}.png`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('saved_product_images')
        .upload(filename, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        throw new Error("Failed to upload image");
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('saved_product_images')
        .getPublicUrl(filename);

      // Save to database
      const { error: dbError } = await supabase
        .from('saved_product_images')
        .insert({
          user_id: session.user.id,
          original_filename: filename,
          storage_path: filename,
          image_url: publicUrl
        });

      if (dbError) {
        throw new Error("Failed to save image metadata");
      }

      toast.success("Image saved successfully");
    } catch (error) {
      toast.error("Failed to save image");
    }
  };

  const renderGeneratedImages = () => (
    <ScrollArea className="h-[300px]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {isGenerating ? (
          <div className="col-span-2 md:col-span-4 flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : !images || images.length === 0 ? (
          <Card className="col-span-2 md:col-span-4 p-4 text-center bg-gray-900 border-gray-700">
            <ImageIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <p className="text-gray-400">No images generated yet</p>
          </Card>
        ) : (
          images.map((image, index) => (
            <Card 
              key={index}
              className="p-2 bg-gray-900 border-gray-700 animate-fade-in"
            >
              <div className="space-y-2">
                <div className="relative group">
                  <img
                    src={image.url}
                    alt={`Generated product shot ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(image.url)}
                      className="text-white hover:text-purple-400"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSaveImage(image.url)}
                      className="text-white hover:text-purple-400"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="bg-gray-900 rounded-lg border-2 border-dashed border-gray-700">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-gray-800 px-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generated">Generated</TabsTrigger>
            <TabsTrigger value="saved">Saved Images</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="generated" className="m-0">
          {renderGeneratedImages()}
        </TabsContent>
        
        <TabsContent value="saved" className="m-0">
          <SavedImagesGrid onSelect={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
