
import React from 'react';
import { ProductShotFormData, ProductShotSettings, GeneratedImage } from '@/types/product-shoot';

export interface ProductShootAdapterProps {
  formData: ProductShotFormData;
  images: GeneratedImage[];
  isSubmitting: boolean;
  error: string;
  availableCredits: number;
  handleProductShotSubmit: (formData: ProductShotFormData) => Promise<boolean>;
  retryStatusCheck: (imageId: string) => Promise<boolean>;
  clearImages: () => void;
  
  // We'll provide these as defaults
  settings?: ProductShotSettings;
  setSettings?: (settings: ProductShotSettings) => void;
  isGenerating?: boolean;
  generatedImages?: GeneratedImage[];
  savedImages?: GeneratedImage[];
  defaultImages?: GeneratedImage[];
  uploadImage?: (file: File) => Promise<string>;
  saveImage?: (image: GeneratedImage) => Promise<boolean>;
  generateProductShot?: (formData: ProductShotFormData) => Promise<string>;
  checkImageStatus?: (imageId: string) => Promise<boolean>;
  setAsDefault?: (imageUrl: string, name?: string) => Promise<boolean>;
  fetchSavedImages?: () => Promise<GeneratedImage[]>;
  fetchDefaultImages?: () => Promise<GeneratedImage[]>;
}

// Adapter function that provides default implementation for missing methods
export function adaptProductShootProps(props: ProductShootAdapterProps): any {
  const defaultSettings: ProductShotSettings = {
    sourceImageUrl: '',
    prompt: '',
    stylePreset: 'product',
    version: 'v2',
    placement: 'auto',
    background: 'transparent',
    outputFormat: 'png',
    imageWidth: 1024,
    imageHeight: 1024,
    quality: 'high'
  };
  
  // Default implementations
  const uploadImage = async (file: File): Promise<string> => {
    console.warn('uploadImage not implemented');
    return '';
  };
  
  const saveImage = async (image: GeneratedImage): Promise<boolean> => {
    console.warn('saveImage not implemented');
    return false;
  };
  
  const generateProductShot = async (formData: ProductShotFormData): Promise<string> => {
    await props.handleProductShotSubmit(formData);
    return '';
  };
  
  const checkImageStatus = async (imageId: string): Promise<boolean> => {
    return props.retryStatusCheck(imageId);
  };
  
  const setAsDefault = async (imageUrl: string, name?: string): Promise<boolean> => {
    console.warn('setAsDefault not implemented');
    return false;
  };
  
  const fetchSavedImages = async (): Promise<GeneratedImage[]> => {
    console.warn('fetchSavedImages not implemented');
    return [];
  };
  
  const fetchDefaultImages = async (): Promise<GeneratedImage[]> => {
    console.warn('fetchDefaultImages not implemented');
    return [];
  };
  
  // Return the adapted props
  return {
    ...props,
    settings: props.settings || defaultSettings,
    setSettings: props.setSettings || ((settings: ProductShotSettings) => {}),
    isGenerating: props.isGenerating || props.isSubmitting,
    generatedImages: props.generatedImages || props.images || [],
    savedImages: props.savedImages || [],
    defaultImages: props.defaultImages || [],
    uploadImage: props.uploadImage || uploadImage,
    saveImage: props.saveImage || saveImage,
    generateProductShot: props.generateProductShot || generateProductShot,
    checkImageStatus: props.checkImageStatus || checkImageStatus,
    setAsDefault: props.setAsDefault || setAsDefault,
    fetchSavedImages: props.fetchSavedImages || fetchSavedImages,
    fetchDefaultImages: props.fetchDefaultImages || fetchDefaultImages
  };
}
