
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProductAdScriptGeneratorProps {
  onComplete: (projectId: string) => void;
}

export const ProductAdScriptGenerator = ({ onComplete }: ProductAdScriptGeneratorProps) => {
  const [title, setTitle] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateScriptMutation = useMutation({
    mutationFn: async (productImageUrl: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) throw new Error("No user session");

      const response = await supabase.functions.invoke("generate-product-ad-script", {
        body: { image_url: productImageUrl }
      });

      if (response.error) throw new Error(response.error.message);

      const { data, error } = await supabase
        .from("product_ad_projects")
        .insert({
          title,
          product_image_url: productImageUrl,
          script: response.data,
          status: "script_generated" as const,
          user_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Script generated successfully");
      onComplete(data.id);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate script");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productImage) {
      toast.error("Please select a product image");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) throw new Error("No user session");

      const fileName = `${session.user.id}/${Date.now()}-${productImage.name}`;
      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, productImage);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(data.path);

      generateScriptMutation.mutate(publicUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            placeholder="Enter project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setProductImage(e.target.files?.[0] || null)}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={!title || !productImage || isUploading || generateScriptMutation.isPending}
        >
          {isUploading ? "Uploading..." : generateScriptMutation.isPending ? "Generating..." : "Generate Script"}
        </Button>
      </form>
    </Card>
  );
};
