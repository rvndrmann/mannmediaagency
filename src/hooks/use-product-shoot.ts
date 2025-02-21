
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GeneratedImage, GenerationResult, ProductShotFormData } from "@/types/product-shoot";

export function useProductShoot() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const queryClient = useQueryClient();

  const handleGenerate = async (formData: ProductShotFormData) => {
    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to continue");
        return;
      }

      // Upload source file
      const sourceFileExt = formData.sourceFile!.name.split('.').pop();
      const sourceFileName = `${crypto.randomUUID()}.${sourceFileExt}`;

      console.log('Uploading source file:', sourceFileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('source_images')
        .upload(sourceFileName, formData.sourceFile!, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('source_images')
        .getPublicUrl(sourceFileName);

      console.log('Source image uploaded successfully:', publicUrl);

      let referenceUrl = '';
      if (formData.generationType === 'reference' && formData.referenceFile) {
        const refFileExt = formData.referenceFile.name.split('.').pop();
        const refFileName = `ref_${crypto.randomUUID()}.${refFileExt}`;
        
        console.log('Uploading reference file:', refFileName);

        const { error: refUploadError } = await supabase.storage
          .from('source_images')
          .upload(refFileName, formData.referenceFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (refUploadError) {
          console.error('Reference upload error:', refUploadError);
          throw new Error(`Failed to upload reference image: ${refUploadError.message}`);
        }

        const { data: { publicUrl: refPublicUrl } } = supabase.storage
          .from('source_images')
          .getPublicUrl(refFileName);

        console.log('Reference image uploaded successfully:', refPublicUrl);
        referenceUrl = refPublicUrl;
      }

      const requestBody: any = {
        image_url: publicUrl,
        shot_size: [formData.shotWidth, formData.shotHeight],
        num_results: formData.numResults,
        fast: formData.fastMode,
        placement_type: formData.placementType,
        sync_mode: formData.syncMode
      };

      if (formData.generationType === 'description') {
        requestBody.scene_description = formData.sceneDescription;
        requestBody.optimize_description = formData.optimizeDescription;
      } else {
        requestBody.ref_image_url = referenceUrl;
      }

      if (formData.placementType === 'manual_placement') {
        requestBody.manual_placement_selection = formData.manualPlacement;
      } else if (formData.placementType === 'manual_padding') {
        requestBody.padding_values = [
          formData.padding.left,
          formData.padding.right,
          formData.padding.top,
          formData.padding.bottom
        ];
      } else if (formData.placementType === 'original') {
        requestBody.original_quality = formData.originalQuality;
      }

      console.log('Sending request to edge function:', requestBody);

      const { data, error } = await supabase.functions.invoke<GenerationResult>(
        'generate-product-shot',
        {
          body: JSON.stringify(requestBody)
        }
      );

      console.log('Edge function response:', data, error);

      if (error) {
        throw new Error(error.message || 'Failed to generate image');
      }

      if (formData.syncMode) {
        if (!data?.images?.length) {
          throw new Error('No images received from the generation API');
        }
        setGeneratedImages(data.images);

        const historyEntry = {
          user_id: session.user.id,
          source_image_url: publicUrl,
          result_url: data.images[0].url,
          scene_description: requestBody.scene_description || null,
          ref_image_url: referenceUrl || null,
          settings: requestBody
        };

        await supabase.from('product_shot_history').insert(historyEntry);
        queryClient.invalidateQueries({ queryKey: ["product-shot-history"] });
        toast.success("Image generated successfully!");
      } else {
        toast.success("Image generation started! Please wait...");
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const errorMessage = error.message || "Failed to generate image. Please try again.";
      
      if (errorMessage.toLowerCase().includes('fal_key')) {
        toast.error("There was an issue with the AI service configuration. Please try again later or contact support.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generatedImages,
    handleGenerate
  };
}
