
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SavedImagesGrid } from "@/components/product-shoot/SavedImagesGrid";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { GeneratedImage } from "@/types/product-shoot";

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
      toast.success("Image downloaded successfully");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const handleSaveImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to save images");
        return;
      }

      const filename = `${crypto.randomUUID()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('saved_product_images')
        .upload(filename, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        throw new Error("Failed to upload image");
      }

      const { data: { publicUrl } } = supabase.storage
        .from('saved_product_images')
        .getPublicUrl(filename);

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

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-gray-800">
          <TabsTrigger 
            value="generated" 
            className="rounded-none data-[state=active]:bg-background"
          >
            Generated
          </TabsTrigger>
          <TabsTrigger 
            value="saved" 
            className="rounded-none data-[state=active]:bg-background"
          >
            Saved Images
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="generated" className="m-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {isGenerating ? (
                <div className="col-span-full flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : !images || images.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-32 text-gray-500">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <p>No images generated yet</p>
                </div>
              ) : (
                images.map((image, index) => (
                  <div 
                    key={image.id || index}
                    className="group relative overflow-hidden rounded-lg border border-gray-800 bg-gray-950"
                  >
                    {image.status === 'processing' ? (
                      <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600 mb-2" />
                        <p className="text-sm text-gray-400">Processing...</p>
                      </div>
                    ) : image.status === 'failed' ? (
                      <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg p-4">
                        <ImageIcon className="h-6 w-6 text-red-500 mb-2" />
                        <p className="text-sm text-red-400">Generation failed</p>
                      </div>
                    ) : (
                      <>
                        <div className="aspect-square">
                          <img
                            src={image.url}
                            alt={image.prompt || `Generated product shot ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                        {image.prompt && (
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80">
                            <p className="text-xs text-gray-300 line-clamp-2">{image.prompt}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="saved" className="m-0">
          <SavedImagesGrid onSelect={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
