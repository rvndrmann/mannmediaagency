
import { useState } from "react";
import { toast } from "sonner";
import { AspectRatio } from "@/types/product-shoot";

export function useProductShotForm(
  onSubmit: (formData: any) => Promise<void>, 
  isGenerating: boolean, 
  isSubmitting: boolean,
  availableCredits: number = 0
) {
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [sceneDescription, setSceneDescription] = useState<string>("");
  const [generationType, setGenerationType] = useState<"description" | "reference">("description");
  const [placementType, setPlacementType] = useState<"original" | "automatic" | "manual_placement" | "manual_padding">("original");
  const [manualPlacement, setManualPlacement] = useState<string>("");
  const [optimizeDescription, setOptimizeDescription] = useState<boolean>(true);
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [originalQuality, setOriginalQuality] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const handleSourceFileSelect = (file: File) => {
    setSourceFile(file);
    const url = URL.createObjectURL(file);
    setSourcePreview(url);
  };

  const handleReferenceFileSelect = (file: File) => {
    setReferenceFile(file);
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
  };

  const handleClearSource = () => {
    if (sourcePreview) {
      URL.revokeObjectURL(sourcePreview);
    }
    setSourceFile(null);
    setSourcePreview(null);
  };

  const handleClearReference = () => {
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const handleAspectRatioChange = (value: AspectRatio) => {
    setAspectRatio(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating || isSubmitting) {
      toast.warning("A generation is already in progress.");
      return;
    }

    if (!sourceFile && !sourcePreview) {
      toast.error("Please upload a source image.");
      return;
    }

    if (generationType === "reference" && !referenceFile && !referencePreview) {
      toast.error("Please upload a reference image.");
      return;
    }

    if (generationType === "description" && !sceneDescription.trim()) {
      toast.error("Please provide a scene description.");
      return;
    }

    if (availableCredits < 1) {
      toast.error("Insufficient credits for product shot generation.");
      return;
    }

    const formData = {
      sourceFile,
      referenceFile,
      sceneDescription,
      generationType,
      placementType,
      manualPlacement,
      optimizeDescription,
      fastMode,
      originalQuality,
      aspectRatio
    };

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to generate product shot.");
    }
  };

  return {
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
}
