
import React, { useCallback } from "react";
import { ProductShotGenerator } from "@/components/product-shoot/ProductShotGenerator";
import { useProductShoot } from "@/hooks/use-product-shoot";

const ProductShot: React.FC = () => {
  const {
    settings,
    setSettings,
    isGenerating,
    generateImage,
    generatedImages,
    savedImages,
    defaultImages,
    saveImage,
    setAsDefault
  } = useProductShoot();

  const handleSaveImage = useCallback((id: string) => {
    saveImage(id);
  }, [saveImage]);

  const handleSetAsDefault = useCallback((id: string) => {
    setAsDefault(id);
  }, [setAsDefault]);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Product Shot Generator</h1>
      <ProductShotGenerator
        settings={settings}
        setSettings={setSettings}
        isGenerating={isGenerating}
        onGenerate={generateImage}
        generatedImages={generatedImages}
        savedImages={savedImages}
        defaultImages={defaultImages}
        onSaveImage={handleSaveImage}
        onSetAsDefault={handleSetAsDefault}
      />
    </div>
  );
};

export default ProductShot;
