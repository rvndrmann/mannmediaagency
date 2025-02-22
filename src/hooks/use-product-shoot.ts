
import { GeneratedImage, ProductShotFormData } from "@/types/product-shoot";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGenerationQueue } from "./product-shoot/use-generation-queue";
import { uploadSourceImage, uploadReferenceImage } from "./product-shoot/upload-service";

export function useProductShoot() {
  const { isGenerating, generatedImages, addToQueue, setGeneratedImages } = useGenerationQueue();

  const handleGenerate = async (formData: ProductShotFormData) => {
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
      const { data: { session } } = await supabase.auth.getSession();
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
    }
  };

  return {
    isGenerating,
    generatedImages,
    handleGenerate
  };
}
