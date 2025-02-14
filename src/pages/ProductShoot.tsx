
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Download, Loader2, ImageIcon, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const ProductShoot = () => {
  const [prompt, setPrompt] = useState("");
  const queryClient = useQueryClient();

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

      if (!userCredits || userCredits.credits_remaining < 1) {
        throw new Error("Insufficient credits. You need 1 credit to generate an image.");
      }

      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images"] });
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      setPrompt("");
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
        <div className="w-1/3 p-6 border-r border-gray-800">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Product Image Generator</h1>
              <p className="text-gray-400">
                Credits remaining: {userCredits?.credits_remaining || 0}
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Describe the product image you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[150px] bg-gray-900 border-gray-700 text-white"
              />

              <Button
                onClick={() => generateImage.mutate()}
                disabled={generateImage.isPending || !prompt.trim()}
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
