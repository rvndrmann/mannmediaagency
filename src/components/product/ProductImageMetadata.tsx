
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductImageMetadataProps {
  imageJobId: string;
}

export function ProductImageMetadata({ imageJobId }: ProductImageMetadataProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: metadata, isLoading } = useQuery({
    queryKey: ["product-metadata", imageJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_image_metadata")
        .select("*")
        .eq("image_job_id", imageJobId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const updateMetadata = useMutation({
    mutationFn: async (values: {
      seo_title?: string;
      seo_description?: string;
      keywords?: string;
      instagram_hashtags?: string;
      product_context?: string;
      custom_title?: string;
    }) => {
      const { error } = await supabase
        .from("product_image_metadata")
        .upsert({
          image_job_id: imageJobId,
          ...values,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Metadata updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update metadata");
      console.error("Metadata update error:", error);
    },
  });

  const handleCopy = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const MetadataField = ({ label, value, onChange }: { 
    label: string; 
    value: string; 
    onChange: (value: string) => void; 
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(value, label)}
            className="h-8 px-2 text-gray-400 hover:text-white"
          >
            {copiedField === label ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {label === "Instagram Hashtags" || label === "Product Description" ? (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[100px]"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      ) : (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      )}
    </div>
  );

  if (isLoading) {
    return <div>Loading metadata...</div>;
  }

  return (
    <div className="space-y-6">
      <MetadataField
        label="SEO Title"
        value={metadata?.seo_title || ""}
        onChange={(value) => updateMetadata.mutate({ seo_title: value })}
      />
      <MetadataField
        label="SEO Description"
        value={metadata?.seo_description || ""}
        onChange={(value) => updateMetadata.mutate({ seo_description: value })}
      />
      <MetadataField
        label="Keywords"
        value={metadata?.keywords || ""}
        onChange={(value) => updateMetadata.mutate({ keywords: value })}
      />
      <MetadataField
        label="Instagram Hashtags"
        value={metadata?.instagram_hashtags || ""}
        onChange={(value) => updateMetadata.mutate({ instagram_hashtags: value })}
      />
      <MetadataField
        label="Product Description"
        value={metadata?.product_context || ""}
        onChange={(value) => updateMetadata.mutate({ product_context: value })}
      />
      <MetadataField
        label="Custom Title"
        value={metadata?.custom_title || ""}
        onChange={(value) => updateMetadata.mutate({ custom_title: value })}
      />
    </div>
  );
}
