
import { useState, ChangeEvent, FormEvent } from "react";
import { ProductShotFormData, AspectRatio } from "@/types/product-shoot";
import { toast } from "sonner";

export function useProductShotForm(
  onSubmit: (data: ProductShotFormData) => Promise<void>,
  isGenerating: boolean,
  isSubmitting: boolean,
  availableCredits: number = 0
) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [generationType, setGenerationType] = useState<"description" | "reference">("description");
  const [placementType, setPlacementType] = useState<"original" | "automatic" | "manual_placement" | "manual_padding">("original");
  const [manualPlacement, setManualPlacement] = useState("");
  const [optimizeDescription, setOptimizeDescription] = useState(true);
  const [fastMode, setFastMode] = useState(false);
  const [originalQuality, setOriginalQuality] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const handleSourceFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSourceFile(file);
    const imageUrl = URL.createObjectURL(file);
    setSourcePreview(imageUrl);
  };

  const handleReferenceFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setReferenceFile(file);
    const imageUrl = URL.createObjectURL(file);
    setReferencePreview(imageUrl);
  };

  const handleClearSource = () => {
    setSourceFile(null);
    if (sourcePreview) {
      URL.revokeObjectURL(sourcePreview);
    }
    setSourcePreview(null);
  };

  const handleClearReference = () => {
    setReferenceFile(null);
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }
    setReferencePreview(null);
  };

  const handleAspectRatioChange = (value: AspectRatio) => {
    setAspectRatio(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!sourceFile) {
      toast.error("Please upload a source image");
      return;
    }

    if (generationType === "reference" && !referenceFile) {
      toast.error("Please upload a reference image");
      return;
    }

    if (generationType === "description" && !sceneDescription.trim()) {
      toast.error("Please enter a scene description");
      return;
    }

    if (availableCredits < 1) {
      toast.error("You don't have enough credits");
      return;
    }

    const formData: ProductShotFormData = {
      sourceFile,
      referenceFile: generationType === "reference" ? referenceFile : null,
      sceneDescription: generationType === "description" ? sceneDescription : undefined,
      generationType,
      placementType,
      manualPlacement: placementType === "manual_placement" || placementType === "manual_padding" ? manualPlacement : undefined,
      optimizeDescription,
      fastMode,
      originalQuality,
      aspectRatio
    };

    await onSubmit(formData);
  };

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
}
