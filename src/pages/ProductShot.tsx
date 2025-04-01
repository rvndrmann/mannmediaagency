
import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/layout/PageLayout";
import { InputPanelAdapter } from "@/components/product-shot/InputPanelAdapter";
import { GalleryPanelAdapter } from "@/components/product-shot/GalleryPanelAdapter";
import { useProductShoot } from '@/hooks/use-product-shoot';

export default function ProductShot() {
  const {
    settings,
    setSettings,
    isGenerating,
    generatedImages,
    savedImages,
    defaultImages,
    uploadImage,
    saveImage,
    setAsDefault,
    fetchSavedImages,
    fetchDefaultImages,
    generateProductShot
  } = useProductShoot();

  // Fetch saved and default images on component mount
  useEffect(() => {
    fetchSavedImages();
    fetchDefaultImages();
  }, [fetchSavedImages, fetchDefaultImages]);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    const url = await uploadImage(file);
    if (url) setSettings({ ...settings, sourceImageUrl: url });
  };

  // Handle generation
  const handleGenerate = () => {
    return generateProductShot(settings.sourceImageUrl);
  };

  return (
    <PageLayout>
      <div className="flex flex-col w-full">
        <h1 className="text-2xl font-bold mb-4">Product Shot Studio</h1>

        <Tabs defaultValue="input" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Input & Settings</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="mt-4">
            <InputPanelAdapter
              prompt={settings.prompt}
              onPromptChange={(prompt) => setSettings({ ...settings, prompt })}
              outputFormat={settings.outputFormat}
              onOutputFormatChange={(outputFormat) => setSettings({ ...settings, outputFormat })}
              imageWidth={settings.imageWidth}
              imageHeight={settings.imageHeight}
              onDimensionsChange={(width, height) => setSettings({ ...settings, imageWidth: width, imageHeight: height })}
              sourceImageUrl={settings.sourceImageUrl}
              onImageUpload={handleImageUpload}
              onImageSelect={(url) => setSettings({ ...settings, sourceImageUrl: url })}
              defaultImages={defaultImages}
              stylePreset={settings.stylePreset}
              onStylePresetChange={(stylePreset) => setSettings({ ...settings, stylePreset })}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <GalleryPanelAdapter
              generatedImages={generatedImages}
              savedImages={savedImages}
              defaultImages={defaultImages}
              onSaveImage={saveImage}
              onSetAsDefault={setAsDefault}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
