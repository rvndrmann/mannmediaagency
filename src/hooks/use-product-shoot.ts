
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GeneratedImage, ProductShotFormData } from '@/types/product-shoot';
import { useQueryClient } from '@tanstack/react-query';
import { productHistoryService } from './product-shoot/history-service';

export const useProductShoot = () => {
  const [formData, setFormData] = useState<ProductShotFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const queryClient = useQueryClient();
  
  // Get the history service instance
  const historyService = productHistoryService;

  useEffect(() => {
    fetchAvailableCredits();
  }, []);

  const fetchAvailableCredits = async () => {
    try {
      const { data, error } = await supabase.from('user_credits').select('*').single();
      if (error) throw error;
      // Use credits_remaining field instead of credits
      setAvailableCredits(data?.credits_remaining || 0);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setAvailableCredits(0);
    }
  };

  const handleProductShotSubmit = async (formData: ProductShotFormData) => {
    if (!formData.sourceFile) {
      toast.error('Please select a product image');
      return;
    }

    setFormData(formData);
    setIsSubmitting(true);
    setError(null);

    try {
      // Create a placeholder for the processing image
      const placeholderImage: GeneratedImage = {
        id: crypto.randomUUID(),
        status: 'processing',
        prompt: formData.prompt,
        url: '',
        createdAt: new Date().toISOString()
      };
      
      setImages(prev => [...prev, placeholderImage]);

      // Upload the source image
      const sourceImageFile = formData.sourceFile;
      const sourceImageFileName = `${crypto.randomUUID()}.${sourceImageFile.name.split('.').pop()}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product-shots-source')
        .upload(sourceImageFileName, sourceImageFile);
      
      if (uploadError) throw uploadError;

      // Get the source image URL
      const { data: { publicUrl: sourceImageUrl } } = supabase.storage
        .from('product-shots-source')
        .getPublicUrl(sourceImageFileName);

      // Process reference image if provided
      let referenceImageUrl: string | undefined;
      if (formData.referenceFile) {
        const refImageFileName = `${crypto.randomUUID()}.${formData.referenceFile.name.split('.').pop()}`;
        
        const { error: refUploadError } = await supabase.storage
          .from('product-shots-references')
          .upload(refImageFileName, formData.referenceFile);
        
        if (refUploadError) throw refUploadError;

        const { data: { publicUrl: refUrl } } = supabase.storage
          .from('product-shots-references')
          .getPublicUrl(refImageFileName);
        
        referenceImageUrl = refUrl;
      }

      // Create the product shot request using RPC function to avoid deep type errors
      const { data, error: insertError } = await supabase.rpc('create_product_shot_request', {
        p_source_image_url: sourceImageUrl,
        p_reference_image_url: referenceImageUrl,
        p_prompt: formData.prompt,
        p_scene_description: formData.sceneDescription,
        p_aspect_ratio: formData.aspectRatio,
        p_placement_type: formData.placementType,
        p_manual_placement: formData.manualPlacement,
        p_generation_type: formData.generationType,
        p_optimize_description: formData.optimizeDescription,
        p_fast_mode: formData.fastMode,
        p_original_quality: formData.originalQuality
      });

      if (insertError) throw insertError;

      // Update the placeholder image with the actual ID
      const requestId = data?.id || placeholderImage.id;
      setImages(prev => 
        prev.map(img => 
          img.id === placeholderImage.id 
            ? { ...img, id: requestId } 
            : img
        )
      );

      // Start a polling process to check the status
      pollProductShotStatus(requestId);
      
      toast.success('Product Shot request submitted successfully');
    } catch (err) {
      console.error('Error submitting product shot:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit product shot request');
      toast.error('Failed to submit product shot request');
      
      // Remove the placeholder image
      setImages(prev => prev.filter(img => img.status !== 'processing'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollProductShotStatus = async (id: string) => {
    const checkStatus = async () => {
      try {
        // Use RPC function to get status
        const { data, error } = await supabase.rpc('get_product_shot_status', {
          p_request_id: id
        });

        if (error) throw error;

        if (data?.status === 'completed' && data.result_url) {
          // Update the image in the state
          setImages(prev => 
            prev.map(img => 
              img.id === id
                ? { 
                    ...img, 
                    status: 'completed',
                    url: data.result_url,
                    prompt: data.prompt || img.prompt
                  } 
                : img
            )
          );
          
          // Refresh history
          await historyService.fetchHistory();
          queryClient.invalidateQueries({ queryKey: ['product-shot-history'] });
          
          return true; // Stop polling
        } else if (data?.status === 'failed') {
          setImages(prev => 
            prev.map(img => 
              img.id === id
                ? { ...img, status: 'failed', error: data.error_message } 
                : img
            )
          );
          return true; // Stop polling
        }
        
        return false; // Continue polling
      } catch (err) {
        console.error('Error checking product shot status:', err);
        return true; // Stop polling on error
      }
    };

    // Initial delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Poll every 5 seconds until completed or failed
    let completed = await checkStatus();
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      completed = await checkStatus();
    }
  };

  const retryStatusCheck = async (imageId: string) => {
    try {
      // Use RPC function to get status
      const { data, error } = await supabase.rpc('get_product_shot_status', {
        p_request_id: imageId
      });

      if (error) throw error;

      if (data?.status === 'completed' && data.result_url) {
        setImages(prev => 
          prev.map(img => 
            img.id === imageId
              ? { 
                  ...img, 
                  status: 'completed', 
                  url: data.result_url,
                  prompt: data.prompt || img.prompt 
                } 
              : img
          )
        );
        toast.success('Image is ready!');
      } else if (data?.status === 'failed') {
        toast.error(data.error_message || 'Image generation failed');
      } else {
        toast.info('Image is still processing. Please check back later.');
      }
    } catch (err) {
      console.error('Error retrying status check:', err);
      toast.error('Failed to check image status');
    }
  };

  const clearImages = () => {
    setImages([]);
  };

  return {
    formData,
    images,
    isSubmitting,
    error,
    availableCredits,
    handleProductShotSubmit,
    retryStatusCheck,
    clearImages
  };
};
