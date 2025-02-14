
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Download, Loader2, ImageIcon, CreditCard, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const ProductShoot = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");
  const queryClient = useQueryClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
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

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const generateImage = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) {
        throw new Error("Please enter a prompt");
      }

      if (!selectedFile) {
        throw new Error("Please upload an image");
      }

      if (!userCredits || userCredits.credits_remaining < 1) {
        throw new Error("Insufficient credits. You need 1 credit to generate an image.");
      }

      const formData = new FormData();
      formData.append('prompt', prompt.trim());
      formData.append('image', selectedFile);
      formData.append('imageSize', imageSize);
      formData.append('numInferenceSteps', inferenceSteps.toString());
      formData.append('guidanceScale', guidanceScale.toString());
      formData.append('outputFormat', outputFormat);

      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: formData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images"] });
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      setPrompt("");
      clearSelectedFile();
      toast.success("Image generation started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    },
  });

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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Left Panel - Input Fields */}
        <div className="w-1/3 p-6 border-r border-gray-800 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Product Image Generator</h1>
              <p className="text-gray-400">
                Credits remaining: {userCredits?.credits_remaining || 0}
              </p>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-white">Upload Image</Label>
              <div className="relative">
                {!previewUrl ? (
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                      onClick={clearSelectedFile}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <Label className="text-white">Prompt</Label>
              <Textarea
                placeholder="Describe the product image you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] bg-gray-900 border-gray-700 text-white"
              />
            </div>

            {/* Image Size */}
            <div className="space-y-2">
              <Label className="text-white">Image Size</Label>
              <Select value={imageSize} onValueChange={setImageSize}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square_hd">Square HD</SelectItem>
                  <SelectItem value="portrait_hd">Portrait HD</SelectItem>
                  <SelectItem value="landscape_hd">Landscape HD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inference Steps */}
            <div className="space-y-2">
              <Label className="text-white">Inference Steps: {inferenceSteps}</Label>
              <Slider
                value={[inferenceSteps]}
                onValueChange={(value) => setInferenceSteps(value[0])}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Guidance Scale */}
            <div className="space-y-2">
              <Label className="text-white">Guidance Scale: {guidanceScale}</Label>
              <Slider
                value={[guidanceScale]}
                onValueChange={(value) => setGuidanceScale(value[0])}
                min={1}
                max={7}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <Label className="text-white">Output Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={() => generateImage.mutate()}
              disabled={generateImage.isPending || !prompt.trim() || !selectedFile}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {generateImage.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  <CreditCard className="mr-2 h-4 w-4" />
                  Generate Image (1 credit)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Generated Images */}
        <div className="flex-1 p-6">
          <ScrollArea className="h-[calc(100vh-3rem)]">
            <div className="grid grid-cols-1 gap-6">
              {imagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : images?.length === 0 ? (
                <Card className="p-6 text-center bg-gray-900 border-gray-700">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No images generated yet</p>
                </Card>
              ) : (
                images?.map((image) => (
                  <Card 
                    key={image.id}
                    className="p-4 bg-gray-900 border-gray-700 animate-fade-in"
                  >
                    <div className="space-y-4">
                      <img
                        src={image.result_url}
                        alt={image.prompt}
                        className="w-full h-auto rounded-lg"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {image.prompt}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(image.result_url)}
                          className="text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ProductShoot;
