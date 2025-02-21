
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { ImageUploader } from "@/components/product-shoot-v2/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedImage {
  url: string;
  content_type: string;
}

interface GenerationResult {
  images: GeneratedImage[];
}

const ProductShootV2 = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [placementType, setPlacementType] = useState<string>("manual_placement");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size > 12 * 1024 * 1024) {
          toast.error("File size must be less than 12MB");
          return;
        }
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error("Please upload an image first");
      return;
    }

    if (!sceneDescription) {
      toast.error("Please provide a scene description");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      // First upload the image to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `product-shots/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('source_images')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('source_images')
        .getPublicUrl(filePath);

      console.log('Image uploaded successfully:', publicUrl);

      // Call our edge function to generate the product shot
      const response = await fetch('/functions/v1/generate-product-shot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          image_url: publicUrl,
          scene_description: sceneDescription,
          placement_type: placementType,
          manual_placement_selection: "bottom_center"
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Generation API error:', responseData);
        throw new Error(responseData.error || 'Failed to generate image');
      }

      if (!responseData.images || !responseData.images.length) {
        throw new Error('No images received from the generation API');
      }

      setGeneratedImages(responseData.images);
      toast.success("Image generated successfully!");
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || "Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 relative">
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-6">Product Shoot V2</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label>Product Image</Label>
                    <ImageUploader
                      previewUrl={previewUrl}
                      onFileSelect={handleFileSelect}
                      onClear={clearSelectedFile}
                      helpText="Upload your product image (max 12MB)"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="sceneDescription">Scene Description</Label>
                    <Textarea
                      id="sceneDescription"
                      placeholder="Describe the scene or background you want for your product..."
                      value={sceneDescription}
                      onChange={(e) => setSceneDescription(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="placementType">Placement Type</Label>
                    <Select
                      value={placementType}
                      onValueChange={setPlacementType}
                    >
                      <SelectTrigger id="placementType">
                        <SelectValue placeholder="Select placement type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Original Position</SelectItem>
                        <SelectItem value="automatic">Automatic (10 positions)</SelectItem>
                        <SelectItem value="manual_placement">Manual Placement</SelectItem>
                        <SelectItem value="manual_padding">Manual Padding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !selectedFile || !sceneDescription}
                    className="w-full"
                  >
                    {isGenerating ? "Generating..." : "Generate Product Shot"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <Label>Generated Images</Label>
                  <div className="bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 p-4 min-h-[500px]">
                    {generatedImages.length > 0 ? (
                      <div className="grid gap-4">
                        {generatedImages.map((image, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={image.url}
                              alt={`Generated product shot ${index + 1}`}
                              className="w-full h-full object-contain rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-gray-500 text-center">
                          {isGenerating ? "Generating your product shot..." : "Generated images will appear here..."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProductShootV2;
