
import { GeneratedImage, ProductShotFormData } from "@/types/product-shoot";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGenerationQueue } from "./product-shoot/use-generation-queue";
import { uploadSourceImage, uploadReferenceImage } from "./product-shoot/upload-service";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useProductShoot() {
  const { isGenerating, generatedImages, addToQueue, setGeneratedImages } = useGenerationQueue();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    }
  });

  const createImageGenerationJob = async (
    requestId: string, 
    prompt: string, 
    settings: any
  ) => {
    try {
      const { error } = await supabase
        .from('image_generation_jobs')
        .insert({
          user_id: session?.user.id,
          request_id: requestId,
          status: 'pending',
          prompt: prompt,
          settings: settings,
          visibility: 'public'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating image generation job:', error);
      throw error;
    }
  };

  const handleGenerate = async (formData: ProductShotFormData) => {
    // Prevent multiple submissions
    if (isSubmitting || isGenerating) {
      console.log('Generation already in progress');
      return;
    }

    setIsSubmitting(true);
    const tempRequestId = crypto.randomUUID();
    const placeholderImage: GeneratedImage = {
      id: `temp-${tempRequestId}`,
      url: '',
      content_type: 'image/png',
      status: 'processing',
      prompt: formData.sceneDescription
    };
    
    setGeneratedImages(prev => [...prev, placeholderImage]);

    try {
      if (!session) {
        toast.error("Please sign in to continue");
        return;
      }

      const sourceUrl = await uploadSourceImage(formData.sourceFile!);
      let referenceUrl = '';

      if (formData.generationType === 'reference' && formData.referenceFile) {
        referenceUrl = await uploadReferenceImage(formData.referenceFile);
      }

      const requestBody: any = {
        image_url: sourceUrl,
        shot_size: [formData.shotWidth, formData.shotHeight],
        num_results: formData.numResults,
        fast: formData.fastMode,
        placement_type: formData.placementType,
        sync_mode: false
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

      console.log('Sending generation request:', requestBody);

      const { data, error } = await supabase.functions.invoke<{ requestId: string }>(
        'generate-product-shot',
        {
          body: JSON.stringify(requestBody)
        }
      );

      if (error) throw new Error(error.message);
      if (!data?.requestId) throw new Error('No request ID received from the server');

      console.log('Generation started with request ID:', data.requestId);

      await createImageGenerationJob(
        data.requestId,
        formData.sceneDescription || '',
        requestBody
      );

      addToQueue({
        requestId: data.requestId,
        prompt: formData.sceneDescription || '',
        sourceUrl,
        settings: requestBody
      });

      toast.success("Image generation started! Please wait...");

    } catch (error: any) {
      console.error('Generation error:', error);
      const errorMessage = error.message || "Failed to generate image. Please try again.";
      
      setGeneratedImages(prev => 
        prev.map(img => 
          img.id === `temp-${tempRequestId}`
            ? { ...img, status: 'failed' as const }
            : img
        )
      );
      
      if (errorMessage.toLowerCase().includes('fal_key')) {
        toast.error("There was an issue with the AI service configuration. Please try again later or contact support.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isGenerating,
    isSubmitting,
    generatedImages,
    handleGenerate
  };
}
