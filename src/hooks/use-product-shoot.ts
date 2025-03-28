import { useState, useCallback, useEffect } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { saveToHistory } from '@/hooks/product-shoot/history-service';

export function useProductShoot() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);

  const handleGenerate = useCallback(async (formData: any) => {
    if (!formData.sourceFile) {
      toast.error("Please upload a product image");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image
      const { sourceUrl } = await uploadSourceImage(formData);
      
      // Generate product shot
      const { data, error } = await supabase.functions.invoke('generate-product-shot', {
        body: {
          image_url: sourceUrl,
          scene_description: formData.sceneDescription,
          ref_image_url: formData.referenceImageUrl,
          optimize_description: formData.optimizeDescription,
          num_results: formData.numResults,
          fast: formData.fastMode,
          placement_type: formData.placementType,
          original_quality: formData.originalQuality,
          shot_size: [formData.shotWidth, formData.shotHeight],
          manual_placement_selection: formData.manualPlacement,
          padding_values: [
            formData.padding.top,
            formData.padding.right,
            formData.padding.bottom,
            formData.padding.left
          ]
        }
      });

      if (error) {
        throw error;
      }

      console.log('Generation result:', data);
      
      // Create database record
      const { error: dbError } = await supabase
        .from('image_generation_jobs')
        .insert({
          prompt: formData.sceneDescription,
          request_id: data.requestId,
          status: 'in_queue',
          source_image_url: sourceUrl,
          settings: {
            ...formData,
            sourceUrl,
            shotSize: [formData.shotWidth, formData.shotHeight],
            placement_type: formData.placementType,
            aspectRatio: formData.aspectRatio // Save aspect ratio setting
          },
          user_id: (await supabase.auth.getUser()).data.user?.id,
          visibility: formData.visibility || 'private' // Add visibility setting
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Error saving generation: ' + dbError.message);
      }

      // Start polling for status
      toast.success("Image generation started");
      setIsGenerating(true);

      // Reset form and update UI
      loadRecentGenerations();
    } catch (err) {
      console.error('Error during generation:', err);
      toast.error('Error generating image: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const uploadSourceImage = async (formData: any) => {
    const file = formData.sourceFile;
    if (!file) {
      throw new Error("No source image provided");
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const timestamp = new Date().getTime();
    const imageName = `${userId}_${timestamp}_${file.name}`;
    const imagePath = `product-shots/${imageName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(imagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage error:', uploadError);
      throw new Error('Failed to upload image: ' + uploadError.message);
    }

    // Fix the URL construction to use the public URL method instead
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(imagePath);
    
    const sourceUrl = publicUrlData.publicUrl;
    console.log('Uploaded image URL:', sourceUrl);
    
    return { sourceUrl };
  };

  const loadRecentGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Map the database status enum to the UI status strings
      const mappedData = data.map(job => ({
        ...job,
        status: 
          job.status === 'in_queue' ? 'processing' :
          job.status === 'completed' ? 'completed' :
          job.status === 'failed' ? 'failed' : 'processing'
      }));
      
      setGeneratedImages(mappedData);
    } catch (err) {
      console.error('Error loading generations:', err);
      toast.error('Error loading recent generations');
    }
  };

  // Function to save a completed image generation to product_shot_history
  const saveToProductHistory = async (image: any) => {
    if (image.status !== 'completed' || !image.result_url) {
      return false;
    }

    try {
      // Save to history table
      const { data, error } = await supabase
        .from('product_shot_history')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          source_image_url: image.source_image_url,
          result_url: image.result_url,
          scene_description: image.prompt,
          settings: image.settings,
          visibility: 'private'
        });

      if (error) {
        console.error('Error saving to history:', error);
        return false;
      }

      toast.success('Image saved to your history');
      return true;
    } catch (err) {
      console.error('Error saving image to history:', err);
      return false;
    }
  };

  const handleRetryImageCheck = async (jobId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-image-generation', {
        body: { 
          jobId,
          source: 'bria' // Explicitly set the source for product shots
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Unknown error during retry');
      
      toast.success('Generation retry initiated');
      await loadRecentGenerations();
    } catch (err) {
      console.error('Error retrying generation:', err);
      toast.error('Failed to retry generation: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-save completed generations to product shot history
  useEffect(() => {
    if (generatedImages && generatedImages.length > 0) {
      generatedImages.forEach(async (image) => {
        if (image.status === 'completed' && image.result_url) {
          try {
            await saveToHistory({
              id: image.id,
              url: image.result_url,
              content_type: 'image/jpeg',
              status: 'completed',
              prompt: image.prompt
            }, image.source_image_url, image.settings);
          } catch (err) {
            console.error('Error auto-saving to history:', err);
          }
        }
      });
    }
  }, [generatedImages]);

  // Load generations on mount
  useEffect(() => {
    loadRecentGenerations();
  }, []);

  return {
    isGenerating,
    isSubmitting,
    generatedImages,
    handleGenerate,
    handleRetryImageCheck,
    loadRecentGenerations,
    saveToProductHistory
  };
}
