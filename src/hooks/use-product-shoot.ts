
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { ProductShootSettings, GeneratedImage, GenerationResponse, StatusResponse } from '@/types/product-shoot';
import { useProductShootApi } from '@/hooks/product-shoot/use-product-shoot-api';
import { useGenerationQueue } from '@/hooks/product-shoot/use-generation-queue';
import { ProductShootHistoryService } from '@/hooks/product-shoot/history-service';

// Default settings
const defaultSettings: ProductShootSettings = {
  sourceImageUrl: '',
  prompt: '',
  stylePreset: 'product',
  version: 'v1',
  placement: 'original',
  background: 'transparent',
  outputFormat: 'png',
  imageWidth: 1024,
  imageHeight: 1024,
  quality: 'standard'
};

export function useProductShoot() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ProductShootSettings>(defaultSettings);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [defaultImages, setDefaultImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  const { submitGenerationJob, checkJobStatus } = useProductShootApi();
  const queue = useGenerationQueue();
  const historyService = new ProductShootHistoryService();

  // Generate a product shot
  const generateProductShot = useCallback(async (sourceImageUrl: string) => {
    try {
      setIsGenerating(true);
      
      // Validate input
      if (!sourceImageUrl) {
        toast({
          title: 'Error',
          description: 'No source image provided',
          variant: 'destructive'
        });
        setIsGenerating(false);
        return null;
      }
      
      // Submit job to API
      const response = await submitGenerationJob(
        sourceImageUrl,
        settings.prompt,
        {
          stylePreset: settings.stylePreset,
          background: settings.background,
          placement: settings.placement,
          outputFormat: settings.outputFormat,
          version: settings.version,
          width: settings.imageWidth,
          height: settings.imageHeight,
          quality: settings.quality
        }
      );
      
      if (!response?.imageId) {
        toast({
          title: 'Error',
          description: 'Failed to generate product shot',
          variant: 'destructive'
        });
        setIsGenerating(false);
        return null;
      }
      
      // Add job to polling queue
      queue.addToQueue(response.imageId);
      
      // Return the response
      return response;
    } catch (error) {
      console.error('Error generating product shot:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
      setIsGenerating(false);
      return null;
    }
  }, [settings, submitGenerationJob, toast, queue]);

  // Check the status of a product shot generation job
  const checkImageStatus = useCallback(async (imageId: string) => {
    try {
      const status = await checkJobStatus(imageId);
      
      if (status.status === 'completed' && status.resultUrl) {
        // Add to generated images
        const newImage: GeneratedImage = {
          id: imageId,
          status: 'completed',
          prompt: settings.prompt,
          createdAt: new Date().toISOString(),
          resultUrl: status.resultUrl,
          inputUrl: settings.sourceImageUrl,
          settings: settings
        };
        
        setGeneratedImages(prev => [newImage, ...prev]);
        setIsGenerating(false);
        
        toast({
          title: 'Success',
          description: 'Product shot generated successfully'
        });
        
        return newImage;
      } else if (status.status === 'failed') {
        setIsGenerating(false);
        
        toast({
          title: 'Error',
          description: status.error || 'Failed to generate product shot',
          variant: 'destructive'
        });
        
        return null;
      }
      
      // Still processing
      return null;
    } catch (error) {
      console.error('Error checking image status:', error);
      setIsGenerating(false);
      
      toast({
        title: 'Error',
        description: 'Failed to check generation status',
        variant: 'destructive'
      });
      
      return null;
    }
  }, [settings, checkJobStatus, toast]);

  // Save a generated image to the user's account
  const saveImage = useCallback(async (imageId: string) => {
    try {
      const image = generatedImages.find(img => img.id === imageId);
      if (!image) {
        toast({
          title: 'Error',
          description: 'Image not found',
          variant: 'destructive'
        });
        return false;
      }
      
      await historyService.saveProductShot(image);
      
      toast({
        title: 'Success',
        description: 'Image saved successfully'
      });
      
      await fetchSavedImages();
      return true;
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: 'Error',
        description: 'Failed to save image',
        variant: 'destructive'
      });
      return false;
    }
  }, [generatedImages, toast, historyService]);

  // Set an image as the default product image
  const setAsDefault = useCallback(async (imageId: string) => {
    try {
      const image = [...generatedImages, ...savedImages].find(img => img.id === imageId);
      if (!image) {
        toast({
          title: 'Error',
          description: 'Image not found',
          variant: 'destructive'
        });
        return false;
      }
      
      await historyService.setAsDefaultProductImage(image);
      
      toast({
        title: 'Success',
        description: 'Set as default product image'
      });
      
      await fetchDefaultImages();
      return true;
    } catch (error) {
      console.error('Error setting as default:', error);
      toast({
        title: 'Error',
        description: 'Failed to set as default',
        variant: 'destructive'
      });
      return false;
    }
  }, [generatedImages, savedImages, toast, historyService]);

  // Upload an image and return its URL
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const uniqueId = uuidv4();
      const ext = file.name.split('.').pop();
      const filePath = `product-shots/${uniqueId}.${ext}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('images')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  // Fetch saved images from history
  async function fetchSavedImages() {
    try {
      const images = await historyService.getSavedProductShots();
      setSavedImages(images);
      return images;
    } catch (error) {
      console.error('Error fetching saved images:', error);
      return [];
    }
  }

  // Fetch default product images
  async function fetchDefaultImages() {
    try {
      const images = await historyService.getDefaultProductImages();
      setDefaultImages(images);
      return images;
    } catch (error) {
      console.error('Error fetching default images:', error);
      return [];
    }
  }

  // Listen for queue status changes
  useEffect(() => {
    if (!queue.isPolling && queue.completedIds && queue.completedIds.length > 0) {
      setIsGenerating(false);
    }
  }, [queue.isPolling, queue.completedIds]);

  // Return the hook API
  return {
    settings,
    setSettings,
    isGenerating,
    generatedImages,
    savedImages,
    defaultImages,
    generateProductShot,
    checkImageStatus,
    saveImage,
    setAsDefault,
    uploadImage,
    fetchSavedImages,
    fetchDefaultImages,
    addToQueue: queue.addToQueue,
    checkStatus: queue.checkJobStatus,
    isLoading: queue.isPolling
  };
}
