
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GeneratedImage, GenerationResult, ProductShotFormData } from "@/types/product-shoot";

interface GenerationQueueItem {
  requestId: string;
  prompt: string;
  retries: number;
  sourceUrl: string;
  settings: any;
}

const POLLING_INTERVAL = 2000;
const MAX_RETRIES = 30;

export function useProductShoot() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationQueue, setGenerationQueue] = useState<GenerationQueueItem[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (generationQueue.length === 0) return;

    const pollInterval = setInterval(async () => {
      const updatedQueue = [...generationQueue];
      const newGeneratedImages = [...generatedImages];
      let queueChanged = false;

      for (let i = 0; i < updatedQueue.length; i++) {
        const item = updatedQueue[i];
        
        try {
          console.log(`Checking status for request: ${item.requestId}`);
          const response = await supabase.functions.invoke<GenerationResult>(
            'check-generation-status',
            {
              body: { requestId: item.requestId }
            }
          );

          if (response.error) {
            console.error('Status check error:', response.error);
            throw new Error(response.error.message);
          }
          
          if (response.data) {
            console.log('Status check response:', response.data);
            
            // Map the received images to our GeneratedImage type
            const completedImages = response.data.images?.map(img => ({
              ...img,
              id: `${item.requestId}-${crypto.randomUUID()}`,
              status: 'completed' as const,
              prompt: item.prompt
            })) || [];
            
            const imageIndex = newGeneratedImages.findIndex(
              img => img.id === `temp-${item.requestId}`
            );
            
            if (imageIndex !== -1) {
              if (completedImages.length > 0) {
                newGeneratedImages[imageIndex] = completedImages[0];
              }
            } else if (completedImages.length > 0) {
              newGeneratedImages.push(...completedImages);
            }

            if (response.data.status === 'completed' || response.data.status === 'failed') {
              updatedQueue.splice(i, 1);
              queueChanged = true;
              i--;
              
              if (response.data.status === 'completed' && completedImages.length > 0) {
                try {
                  await saveToHistory(completedImages[0], item.sourceUrl, item.settings);
                  console.log('Successfully saved to history:', completedImages[0]);
                } catch (saveError) {
                  console.error('Error saving to history:', saveError);
                  toast.error("Failed to save generation history");
                }
              } else if (response.data.status === 'failed') {
                console.error('Generation failed:', response.data.error);
                toast.error(response.data.error || "Generation failed. Please try again.");
              }
            } else if (item.retries >= MAX_RETRIES) {
              const imageIndex = newGeneratedImages.findIndex(
                img => img.id === `temp-${item.requestId}`
              );
              
              if (imageIndex !== -1) {
                newGeneratedImages[imageIndex] = {
                  ...newGeneratedImages[imageIndex],
                  status: 'failed'
                };
              }

              updatedQueue.splice(i, 1);
              queueChanged = true;
              i--;
              toast.error("Generation timed out. Please try again.");
            } else {
              updatedQueue[i] = {
                ...item,
                retries: item.retries + 1
              };
              queueChanged = true;
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }

      if (queueChanged) {
        setGenerationQueue(updatedQueue);
        setGeneratedImages(newGeneratedImages);
      }

      if (updatedQueue.length === 0) {
        setIsGenerating(false);
        clearInterval(pollInterval);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [generationQueue, generatedImages]);

  const saveToHistory = async (
    image: GeneratedImage, 
    sourceUrl: string,
    settings: any
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No session found when trying to save to history');
      return;
    }

    try {
      const historyEntry = {
        user_id: session.user.id,
        result_url: image.url,
        source_image_url: sourceUrl,
        scene_description: image.prompt || null,
        settings: settings || {}
      };

      console.log('Saving history entry:', historyEntry);

      const { error: dbError } = await supabase
        .from('product_shot_history')
        .insert(historyEntry);

      if (dbError) {
        console.error('Error saving to history:', dbError);
        throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ["product-shot-history"] });
    } catch (error) {
      console.error('Error saving to history:', error);
      throw error;
    }
  };

  const handleGenerate = async (formData: ProductShotFormData) => {
    setIsGenerating(true);
    
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

      const sourceFileExt = formData.sourceFile!.name.split('.').pop();
      const sourceFileName = `${crypto.randomUUID()}.${sourceFileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('source_images')
        .upload(sourceFileName, formData.sourceFile!, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('source_images')
        .getPublicUrl(sourceFileName);

      let referenceUrl = '';
      if (formData.generationType === 'reference' && formData.referenceFile) {
        const refFileExt = formData.referenceFile.name.split('.').pop();
        const refFileName = `ref_${crypto.randomUUID()}.${refFileExt}`;
        
        const { error: refUploadError } = await supabase.storage
          .from('source_images')
          .upload(refFileName, formData.referenceFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (refUploadError) {
          throw new Error(`Failed to upload reference image: ${refUploadError.message}`);
        }

        const { data: { publicUrl: refPublicUrl } } = supabase.storage
          .from('source_images')
          .getPublicUrl(refFileName);

        referenceUrl = refPublicUrl;
      }

      const requestBody: any = {
        image_url: publicUrl,
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

      setGenerationQueue(prev => [...prev, {
        requestId: data.requestId,
        prompt: formData.sceneDescription || '',
        retries: 0,
        sourceUrl: publicUrl,
        settings: requestBody
      }]);

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
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generatedImages,
    handleGenerate
  };
}
