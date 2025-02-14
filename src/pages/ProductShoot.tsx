
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, ChevronLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { ProductImageMetadata } from "@/components/product/ProductImageMetadata";
import { ProductImageHistory } from "@/components/product/ProductImageHistory";

type ImageSize = 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';

export default function ProductShoot() {
  const navigate = useNavigate();
  const [productImage, setProductImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>("square_hd");
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [numInferenceSteps, setNumInferenceSteps] = useState(8);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedHistoryImage, setSelectedHistoryImage] = useState<{
    jobId: string;
    url: string;
  } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const generateMetadata = async (jobId: string, promptText: string) => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-product-metadata`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            imageJobId: jobId,
            prompt: promptText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate metadata");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error generating metadata:", error);
      toast.error("Failed to generate metadata");
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!productImage || !prompt) {
        throw new Error("Please provide both an image and a prompt");
      }

      const formData = new FormData();
      formData.append("image", productImage);
      formData.append("prompt", prompt);
      formData.append("imageSize", imageSize);
      formData.append("guidanceScale", guidanceScale.toString());
      formData.append("numInferenceSteps", numInferenceSteps.toString());
      formData.append("outputFormat", "png");

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("You must be logged in to generate images");
      }

      console.log('Initiating image generation');
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/initiate-image-generation`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to initiate image generation (${response.status})`);
      }

      const data = await response.json();
      return data.jobId;
    },
    onSuccess: (jobId) => {
      setCurrentJobId(jobId);
      toast.success("Image generation started!");
    },
    onError: (error) => {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start image generation");
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("You must be logged in to check image status");
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/check-image-status`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check image status");
      }

      const data = await response.json();
      return data;
    },
  });

  useEffect(() => {
    if (!currentJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await checkStatusMutation.mutateAsync(currentJobId);
        
        if (result.status === 'completed') {
          setGeneratedImage(result.resultUrl);
          setCurrentJobId(null);
          toast.success("Image generated successfully!");
          // Generate metadata after successful image generation
          await generateMetadata(currentJobId, prompt);
          clearInterval(pollInterval);
        } else if (result.status === 'failed') {
          setCurrentJobId(null);
          toast.error("Image generation failed");
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        clearInterval(pollInterval);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [currentJobId]);

  const handleHistoryImageSelect = (jobId: string, imageUrl: string) => {
    setSelectedHistoryImage({ jobId, url: imageUrl });
    setGeneratedImage(imageUrl);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-2xl font-bold">Product Shoot</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel */}
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById("imageUpload")?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                  <input
                    type="file"
                    id="imageUpload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
                {previewUrl && (
                  <div className="mt-4 relative aspect-square w-full max-w-[200px]">
                    <img
                      src={previewUrl}
                      alt="Product preview"
                      className="rounded-lg object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Prompt
                </label>
                <Textarea
                  placeholder="Describe how you want your product to look..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium mb-3">Advanced Settings</h3>
                
                <div className="space-y-2">
                  <Label>Image Size</Label>
                  <Select value={imageSize} onValueChange={(value: ImageSize) => setImageSize(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select image size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square_hd">Square HD</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                      <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                      <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                      <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Guidance Scale ({guidanceScale})</Label>
                  <Slider
                    value={[guidanceScale]}
                    onValueChange={(value) => setGuidanceScale(value[0])}
                    min={1}
                    max={20}
                    step={0.1}
                  />
                  <p className="text-xs text-gray-400">Controls how closely the AI follows your prompt</p>
                </div>

                <div className="space-y-2">
                  <Label>Quality Steps ({numInferenceSteps})</Label>
                  <Slider
                    value={[numInferenceSteps]}
                    onValueChange={(value) => setNumInferenceSteps(value[0])}
                    min={1}
                    max={50}
                    step={1}
                  />
                  <p className="text-xs text-gray-400">Higher values produce better quality but take longer</p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => generateMutation.mutate()}
                disabled={!productImage || !prompt || generateMutation.isPending || !!currentJobId}
              >
                {generateMutation.isPending || currentJobId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {currentJobId ? "Generating..." : "Starting generation..."}
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Generation History</h3>
              <ProductImageHistory onSelectImage={handleHistoryImageSelect} />
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-8">
              <h3 className="text-xl font-semibold mb-4">Generated Image</h3>
              <div className="border-2 border-dashed border-gray-700 rounded-lg aspect-square flex items-center justify-center mb-6">
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated product"
                    className="rounded-lg object-cover w-full h-full"
                  />
                ) : (
                  <div className="text-gray-400 text-center p-4">
                    {currentJobId ? "Generating your image..." : "Generated image will appear here"}
                  </div>
                )}
              </div>
              
              {(currentJobId || selectedHistoryImage?.jobId) && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Image Metadata</h3>
                  <div className="border rounded-lg p-4">
                    <ProductImageMetadata 
                      imageJobId={currentJobId || selectedHistoryImage?.jobId || ""} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
