
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImageUploader } from "@/components/product-shoot/ImageUploader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";

interface ProductAdScriptGeneratorProps {
  activeProjectId: string | null;
  onProjectCreated: (id: string) => void;
}

export const ProductAdScriptGenerator = ({
  activeProjectId,
  onProjectCreated,
}: ProductAdScriptGeneratorProps) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: currentProject } = useQuery({
    queryKey: ["product-ad-project", activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const { data, error } = await supabase
        .from("product_ad_projects")
        .select("*")
        .eq("id", activeProjectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeProjectId,
  });

  const generateScript = useMutation({
    mutationFn: async () => {
      if (!selectedFile && !previewUrl) {
        throw new Error("Please upload a product image");
      }

      let publicUrl = previewUrl;

      // Upload image if it's a new file
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('source-images')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: uploadedUrl } } = supabase.storage
          .from('source-images')
          .getPublicUrl(fileName);

        publicUrl = uploadedUrl;
      }

      const { data, error } = await supabase.functions.invoke('generate-product-ad-script', {
        body: {
          title,
          productDescription,
          targetAudience,
          imageUrl: publicUrl,
        },
      });

      if (error) throw error;

      // Create or update project
      const projectData = {
        title,
        product_image_url: publicUrl,
        script: data.script,
        status: 'script_generated',
      };

      if (activeProjectId) {
        const { error: updateError } = await supabase
          .from('product_ad_projects')
          .update(projectData)
          .eq('id', activeProjectId);

        if (updateError) throw updateError;
      } else {
        const { data: newProject, error: insertError } = await supabase
          .from('product_ad_projects')
          .insert({
            ...projectData,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newProject) onProjectCreated(newProject.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ad-project"] });
      toast.success("Script generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label className="text-white">Project Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your project title"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-white">Product Description</Label>
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe your product in detail..."
              className="min-h-[100px] bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-white">Target Audience</Label>
            <Textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Describe your target audience..."
              className="min-h-[100px] bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-white">Product Image</Label>
          <ImageUploader
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onClear={clearFile}
            aspectRatio={1}
            helpText="Upload your product image"
          />
        </div>
      </div>

      <Button
        onClick={() => generateScript.mutate()}
        disabled={generateScript.isPending || !title || !productDescription || !targetAudience || (!selectedFile && !previewUrl)}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {generateScript.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Script...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Script
          </>
        )}
      </Button>

      {currentProject?.script && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <Label className="text-white mb-2">Generated Script</Label>
          <pre className="whitespace-pre-wrap text-white/90 text-sm">
            {JSON.stringify(currentProject.script, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
