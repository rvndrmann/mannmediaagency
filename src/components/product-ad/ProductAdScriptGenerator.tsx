
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImageUploader } from "@/components/product-shoot/ImageUploader";
import { Loader2 } from "lucide-react";

interface ProductAdScriptGeneratorProps {
  onComplete: (projectId: string) => void;
}

export const ProductAdScriptGenerator = ({ onComplete }: ProductAdScriptGeneratorProps) => {
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const generateScriptMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Please upload a product image");
      }

      // First, upload the image
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Generate script using edge function
      const response = await supabase.functions.invoke("generate-product-ad-script", {
        body: {
          productTitle,
          productDescription,
          imageUrl: publicUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Create project in database
      const { data: project, error: projectError } = await supabase
        .from("product_ad_projects")
        .insert({
          title: productTitle,
          product_image_url: publicUrl,
          script: response.data,
          status: 'script_generated'
        })
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }

      return project;
    },
    onSuccess: (data) => {
      toast.success("Script generated successfully!");
      onComplete(data.id);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate script");
    },
  });

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

  return (
    <Card className="p-6 bg-gray-900 border-gray-800">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Create Product Ad Script</h2>
          <p className="text-gray-400 mb-6">
            Upload your product image and provide details to generate a professional ad script.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Product Image
            </label>
            <ImageUploader
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              onClear={clearSelectedFile}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Product Title
            </label>
            <Input
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              placeholder="Enter product title"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Product Description
            </label>
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe your product and its key features..."
              className="min-h-[100px] bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <Button
          onClick={() => generateScriptMutation.mutate()}
          disabled={generateScriptMutation.isPending || !productTitle || !productDescription || !selectedFile}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {generateScriptMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Script...
            </>
          ) : (
            "Generate Ad Script"
          )}
        </Button>
      </div>
    </Card>
  );
};
