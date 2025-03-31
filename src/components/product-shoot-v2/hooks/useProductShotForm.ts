
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AspectRatio, ProductShotFormData } from '@/types/product-shoot';

export const useProductShotForm = (
  onSubmit: (formData: ProductShotFormData) => Promise<void>,
  isGenerating: boolean,
  isSubmitting: boolean,
  availableCredits: number = 0
) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState<string>('');
  const [generationType, setGenerationType] = useState<'description' | 'reference'>('description');
  const [placementType, setPlacementType] = useState<'original' | 'automatic' | 'manual_placement' | 'manual_padding'>('original');
  const [manualPlacement, setManualPlacement] = useState<string>('');
  const [optimizeDescription, setOptimizeDescription] = useState<boolean>(true);
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [originalQuality, setOriginalQuality] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const handleSourceFileSelect = useCallback((file: File) => {
    setSourceFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSourcePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleReferenceFileSelect = useCallback((file: File) => {
    setReferenceFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReferencePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearSource = useCallback(() => {
    setSourceFile(null);
    setSourcePreview(null);
  }, []);

  const handleClearReference = useCallback(() => {
    setReferenceFile(null);
    setReferencePreview(null);
  }, []);

  const handleAspectRatioChange = useCallback((newRatio: AspectRatio) => {
    setAspectRatio(newRatio);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceFile) {
      toast.error('Please select a source image');
      return;
    }

    if (generationType === 'description' && !sceneDescription.trim()) {
      toast.error('Please provide a scene description');
      return;
    }

    if (generationType === 'reference' && !referenceFile) {
      toast.error('Please select a reference image');
      return;
    }

    if (availableCredits <= 0) {
      toast.error('Insufficient credits. Please purchase more credits to continue.');
      return;
    }

    const formData: ProductShotFormData = {
      sourceImage: sourceFile,
      sourceFile,
      referenceFile,
      sourceImageUrl: sourcePreview || '',
      prompt: sceneDescription,
      sceneDescription,
      generationType,
      placementType,
      manualPlacement,
      optimizeDescription,
      fastMode,
      originalQuality,
      aspectRatio,
      placement: placementType === 'original' ? 'original' : 
                placementType === 'automatic' ? 'auto' : 'manual',
      background: 'default',
      stylePreset: 'product'
    };

    onSubmit(formData);
  }, [
    sourceFile,
    referenceFile,
    sourcePreview,
    sceneDescription,
    generationType,
    placementType,
    manualPlacement,
    optimizeDescription,
    fastMode,
    originalQuality,
    aspectRatio,
    onSubmit,
    availableCredits
  ]);

  return {
    sourceFile,
    referenceFile,
    sourcePreview,
    referencePreview,
    sceneDescription,
    generationType,
    placementType,
    manualPlacement,
    optimizeDescription,
    fastMode,
    originalQuality,
    aspectRatio,
    handleSourceFileSelect,
    handleReferenceFileSelect,
    handleClearSource,
    handleClearReference,
    handleSubmit,
    setSceneDescription,
    setGenerationType,
    setPlacementType,
    setManualPlacement,
    setOptimizeDescription,
    setFastMode,
    setOriginalQuality,
    handleAspectRatioChange
  };
};
