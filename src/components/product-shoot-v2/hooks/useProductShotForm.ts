
import { useState } from "react";
import { ProductShotFormData } from "@/types/product-shoot";
import { toast } from "sonner";

export const useProductShotForm = (
  onSubmit: (data: ProductShotFormData) => void,
  isGenerating: boolean,
  isSubmitting: boolean,
  availableCredits: number = 0
) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [generationType, setGenerationType] = useState<"description" | "reference">("description");
  const [placementType, setPlacementType] = useState<"original" | "automatic" | "manual_placement" | "manual_padding">("original");
  const [manualPlacement, setManualPlacement] = useState("");
  const [optimizeDescription, setOptimizeDescription] = useState(true);
  const [numResults, setNumResults] = useState(1);
  const [fastMode, setFastMode] = useState(false);
  const [originalQuality, setOriginalQuality] = useState(true);
  const [shotWidth, setShotWidth] = useState(1024);
  const [shotHeight, setShotHeight] = useState(1024);
  const [padding, setPadding] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  const calculateCreditCost = () => {
    return numResults * 0.2;
  };

  const hasEnoughCredits = () => {
    const requiredCredits = calculateCreditCost();
    return availableCredits >= requiredCredits;
  };

  const handleSourceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSourceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourcePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSource = () => {
    setSourceFile(null);
    setSourcePreview(null);
  };

  const handleClearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating || isSubmitting) {
      return;
    }
    
    if (!sourceFile) {
      toast.error("Please select a source image");
      return;
    }

    if (!hasEnoughCredits()) {
      toast.error(`Insufficient credits. You need ${calculateCreditCost()} credits for this generation.`);
      return;
    }

    if (generationType === "description" && !sceneDescription) {
      toast.error("Please provide a scene description");
      return;
    }

    if (generationType === "reference" && !referenceFile) {
      toast.error("Please select a reference image");
      return;
    }

    const formData: ProductShotFormData = {
      sourceFile,
      referenceFile,
      sceneDescription,
      generationType,
      placementType,
      manualPlacement,
      optimizeDescription,
      numResults,
      fastMode,
      originalQuality,
      shotWidth,
      shotHeight,
      syncMode: false,
      padding
    };

    onSubmit(formData);
  };

  return {
    sourcePreview,
    referencePreview,
    sceneDescription,
    generationType,
    placementType,
    manualPlacement,
    optimizeDescription,
    numResults,
    fastMode,
    originalQuality,
    shotWidth,
    shotHeight,
    padding,
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
    setNumResults,
    setFastMode,
    setOriginalQuality,
    setShotWidth,
    setShotHeight,
    calculateCreditCost,
    hasEnoughCredits
  };
};
