
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export default function ProductShoot() {
  const [productImage, setProductImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
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

      const response = await fetch("/api/generate-product-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      return data.imageUrl;
    },
    onSuccess: (imageUrl) => {
      setGeneratedImage(imageUrl);
      toast.success("Image generated successfully!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Product Shoot</h2>
              <p className="text-gray-400 mb-6">
                Upload your product image and describe how you want it to look.
              </p>
            </div>

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

              <Button
                className="w-full"
                onClick={() => generateMutation.mutate()}
                disabled={!productImage || !prompt || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Result Panel */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Generated Image</h3>
            <div className="border-2 border-dashed border-gray-700 rounded-lg aspect-square flex items-center justify-center">
              {generatedImage ? (
                <img
                  src={generatedImage}
                  alt="Generated product"
                  className="rounded-lg object-cover w-full h-full"
                />
              ) : (
                <div className="text-gray-400 text-center p-4">
                  Generated image will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
