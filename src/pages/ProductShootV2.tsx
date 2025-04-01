
import React, { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InputPanel from "@/components/product-shot/InputPanel";
import GalleryPanel from "@/components/product-shot/GalleryPanel";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { PageLayout } from "@/components/layout/PageLayout";

export default function ProductShootV2() {
  const {
    settings,
    setSettings,
    isGenerating,
    generatedImages,
    savedImages,
    defaultImages,
    uploadImage,
    saveImage,
    generateProductShot,
    checkImageStatus,
    setAsDefault,
    fetchSavedImages,
    fetchDefaultImages
  } = useProductShoot();

  // Fetch saved images and defaults on load
  useEffect(() => {
    fetchSavedImages();
    fetchDefaultImages();
  }, [fetchSavedImages, fetchDefaultImages]);

  const handleGenerate = async () => {
    try {
      if (settings.sourceImageUrl) {
        await generateProductShot(settings.sourceImageUrl);
      } else {
        console.error("No source image URL");
      }
    } catch (error) {
      console.error("Error generating product shot:", error);
    }
  };

  return (
    <PageLayout>
      <div className="flex flex-col w-full">
        <h1 className="text-2xl font-bold mb-4">Product Shot Studio V2</h1>

        <Tabs defaultValue="input" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Input & Settings</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>
          
          <TabsContent value="input" className="mt-4">
            <InputPanel 
              prompt={settings.prompt}
              onPromptChange={(prompt) => setSettings({...settings, prompt})}
              sourceImageUrl={settings.sourceImageUrl}
              onImageUpload={async (file) => {
                const url = await uploadImage(file);
                if (url) setSettings({...settings, sourceImageUrl: url});
              }}
              onImageSelect={(url) => setSettings({...settings, sourceImageUrl: url})}
              defaultImages={defaultImages}
              stylePreset={settings.stylePreset}
              onStylePresetChange={(stylePreset) => setSettings({...settings, stylePreset})}
              placement={settings.placement}
              onPlacementChange={(placement) => setSettings({...settings, placement})}
              background={settings.background}
              onBackgroundChange={(background) => setSettings({...settings, background})}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </TabsContent>
          
          <TabsContent value="gallery" className="mt-4">
            <GalleryPanel 
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
