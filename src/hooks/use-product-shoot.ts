
import { useState, useCallback } from "react";
import { ProductShootSettings, GeneratedImage } from "@/types/product-shoot";
import { useGenerationQueue } from "./product-shoot/use-generation-queue";
import { supabase } from '@/integrations/supabase/client';
import * as historyService from "./product-shoot/history-service";
import { toast } from "sonner";

// Default settings
const defaultSettings: ProductShootSettings = {
  sourceImageUrl: '',
  prompt: '',
  stylePreset: 'product',
  version: 'v1',
  placement: 'product',
  background: 'transparent',
  outputFormat: 'png',
  imageWidth: 768,
  imageHeight: 768,
  quality: 'standard',
};

export function useProductShoot() {
  const [settings, setSettings] = useState<ProductShootSettings>(defaultSettings);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [defaultImages, setDefaultImages] = useState<GeneratedImage[]>([]);
  
  const { addToQueue, checkStatus, isLoading } = useGenerationQueue();
  
  // Upload an image file to storage
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return null;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size exceeds 10MB limit');
      return null;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Generate a unique file path
      const timestamp = Date.now();
      const filePath = `product-shots/${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      
      // Upload to storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (error) {
        throw error;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(data.path);
      
      setUploadProgress(100);
      toast.success('Image uploaded successfully');
      
      // Return the public URL
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Generate a product shot
  const generateProductShot = useCallback(async (sourceImageUrl: string): Promise<string | null> => {
    try {
      setIsGenerating(true);
      
      // Validate inputs
      if (!sourceImageUrl) {
        toast.error('Please upload or select a source image');
        return null;
      }
      
      if (!settings.prompt || !settings.prompt.trim()) {
        toast.error('Please enter a prompt');
        return null;
      }
      
      // Add to queue for processing
      const imageId = await addToQueue(
        sourceImageUrl,
        settings.prompt,
        {
          stylePreset: settings.stylePreset,
          version: settings.version,
          placement: settings.placement,
          background: settings.background,
          outputFormat: settings.outputFormat,
          imageWidth: settings.imageWidth,
          imageHeight: settings.imageHeight,
          quality: settings.quality
        }
      );
      
      if (!imageId) {
        throw new Error('Failed to add image to generation queue');
      }
      
      toast.success('Image added to generation queue');
      
      // Initial status check
      const initialStatus = await checkStatus(imageId);
      
      if (initialStatus.status === 'completed' && initialStatus.resultUrl) {
        // Add to generated images
        const newImage: GeneratedImage = {
          id: imageId,
          prompt: settings.prompt,
          status: 'completed',
          createdAt: new Date().toISOString(),
          resultUrl: initialStatus.resultUrl,
          url: sourceImageUrl,
          source_image_url: sourceImageUrl
        };
        
        setGeneratedImages(prev => [newImage, ...prev]);
        toast.success('Image generated successfully');
      }
      
      return imageId;
    } catch (error) {
      console.error('Error generating product shot:', error);
      toast.error('Failed to generate product shot');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [settings, addToQueue, checkStatus]);

  // Check the status of an image in the queue
  const checkImageStatus = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      const result = await checkStatus(imageId);
      
      if (result.status === 'completed' && result.resultUrl) {
        // Add to generated images
        const newImage: GeneratedImage = {
          id: imageId,
          prompt: 'Generated Product Shot',
          status: 'completed',
          createdAt: new Date().toISOString(),
          resultUrl: result.resultUrl
        };
        
        setGeneratedImages(prev => {
          // Check if this image is already in the array
          if (prev.some(img => img.id === imageId)) {
            return prev.map(img => 
              img.id === imageId ? { ...img, ...newImage } : img
            );
          } else {
            return [newImage, ...prev];
          }
        });
        
        return true;
      }
      
      if (result.status === 'failed') {
        toast.error(`Generation failed: ${result.error || 'Unknown error'}`);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking image status:', error);
      return false;
    }
  }, [checkStatus]);

  // Save an image to history
  const saveImage = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      const success = await historyService.saveImage(imageId);
      
      if (success) {
        // Fetch updated history
        const history = await historyService.fetchHistory();
        setSavedImages(history);
        toast.success('Image saved successfully');
        return true;
      } else {
        toast.error('Failed to save image');
        return false;
      }
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save image');
      return false;
    }
  }, []);

  // Set an image as default
  const setAsDefault = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      const success = await historyService.setAsDefault(imageId);
      
      if (success) {
        // Fetch updated defaults
        const defaults = await historyService.fetchDefaultImages();
        setDefaultImages(defaults);
        toast.success('Image set as default');
        return true;
      } else {
        toast.error('Failed to set image as default');
        return false;
      }
    } catch (error) {
      console.error('Error setting image as default:', error);
      toast.error('Failed to set image as default');
      return false;
    }
  }, []);

  // Fetch saved and default images
  const fetchSavedImages = useCallback(async (): Promise<void> => {
    try {
      const history = await historyService.fetchHistory();
      setSavedImages(history);
    } catch (error) {
      console.error('Error fetching saved images:', error);
    }
  }, []);

  const fetchDefaultImages = useCallback(async (): Promise<void> => {
    try {
      const defaults = await historyService.fetchDefaultImages();
      setDefaultImages(defaults);
    } catch (error) {
      console.error('Error fetching default images:', error);
    }
  }, []);

  return {
    settings,
    setSettings,
    isGenerating,
    isUploading,
    uploadProgress,
    generatedImages,
    savedImages,
    defaultImages,
    uploadImage,
    generateProductShot,
    checkImageStatus,
    saveImage,
    setAsDefault,
    fetchSavedImages,
    fetchDefaultImages
  };
}
