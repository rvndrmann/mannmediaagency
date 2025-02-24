
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { UseAIResponseButton } from "./features/UseAIResponseButton";
import { ProductImageGrid } from "./features/ProductImageGrid";
import { useState } from "react";

interface ProductShotV1Props {
  isMobile: boolean;
  prompt: string;
  previewUrl: string | null;
  imageSize: string;
  inferenceSteps: number;
  guidanceScale: number;
  outputFormat: string;
  productImages: any[];
  imagesLoading: boolean;
  creditsRemaining: number;
  isGenerating: boolean;
  onPromptChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onImageSizeChange: (value: string) => void;
  onInferenceStepsChange: (value: number) => void;
  onGuidanceScaleChange: (value: number) => void;
  onOutputFormatChange: (value: string) => void;
  onGenerate: () => void;
  onDownload: (url: string) => void;
}

interface FeaturePanelProps {
  messages: any[];
  productShotV2: {
    onSubmit: (data: any) => void;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: any[];
  };
  productShotV1: ProductShotV1Props;
}

export function FeaturePanel({ messages, productShotV2, productShotV1 }: FeaturePanelProps) {
  const [sceneDescription, setSceneDescription] = useState("");
  const [imageToVideoPrompt, setImageToVideoPrompt] = useState("");
  const [currentTab, setCurrentTab] = useState("product-shot-v1");

  const allProductImages = [
    ...(productShotV1.productImages || []).map(img => ({
      id: img.id,
      url: img.result_url || img.url,
      prompt: img.prompt,
      source: 'v1' as const
    })),
    ...(productShotV2.generatedImages || []).map(img => ({
      id: img.id,
      url: img.url,
      prompt: img.prompt,
      source: 'v2' as const
    }))
  ];

  const handleSelectFromHistory = (jobId: string, imageUrl: string) => {
    console.log('Selected image:', { jobId, imageUrl });
  };

  const handleUseAIResponse = (response: string) => {
    switch (currentTab) {
      case "product-shot-v1":
        productShotV1.onPromptChange(response);
        break;
      case "product-shot-v2":
        setSceneDescription(response);
        break;
      case "image-to-video":
        setImageToVideoPrompt(response);
        break;
      default:
        break;
    }
  };

  return (
    <Card className="bg-[#1A1F2C] border-gray-800 shadow-lg overflow-hidden">
      <Tabs 
        defaultValue="product-shot-v1" 
        className="h-[calc(100vh-8rem)]"
        onValueChange={(value) => setCurrentTab(value)}
      >
        <TabsList className="w-full bg-[#222222] border-b border-gray-800 px-4 py-2">
          <TabsTrigger value="product-shot-v1">Product Shot V1</TabsTrigger>
          <TabsTrigger value="product-shot-v2">Product Shot V2</TabsTrigger>
          <TabsTrigger value="image-to-video">Image to Video</TabsTrigger>
          <TabsTrigger value="faceless-video">Faceless Video</TabsTrigger>
        </TabsList>

        <TabsContent value="product-shot-v1" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
              <UseAIResponseButton 
                messages={messages}
                onUseResponse={handleUseAIResponse}
              />
            </div>
            <div className="flex-1 overflow-auto">
              <div className="flex h-full">
                <div className="w-1/3 min-w-[320px] border-r border-gray-800">
                  <InputPanel {...productShotV1} />
                </div>
                <div className="flex-1">
                  <GalleryPanel 
                    isMobile={productShotV1.isMobile}
                    images={productShotV1.productImages}
                    isLoading={productShotV1.imagesLoading}
                    onDownload={productShotV1.onDownload}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="product-shot-v2" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
              <UseAIResponseButton 
                messages={messages}
                onUseResponse={handleUseAIResponse}
              />
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <ProductShotForm 
                    onSubmit={productShotV2.onSubmit}
                    isGenerating={productShotV2.isGenerating}
                    isSubmitting={productShotV2.isSubmitting}
                    availableCredits={productShotV2.availableCredits}
                    initialSceneDescription={sceneDescription}
                  />
                </div>
                <div className="space-y-6">
                  {productShotV2.generatedImages.length > 0 && (
                    <GeneratedImagesPanel 
                      images={productShotV2.generatedImages}
                      isGenerating={productShotV2.isGenerating}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="image-to-video" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
              <UseAIResponseButton 
                messages={messages}
                onUseResponse={handleUseAIResponse}
              />
            </div>
            <div className="flex-1 overflow-auto">
              <div className="flex h-full">
                <div className="w-1/3 min-w-[320px] border-r border-gray-800">
                  <ImageToVideoInputPanel
                    {...productShotV1}
                    prompt={imageToVideoPrompt}
                    onPromptChange={(value: string) => setImageToVideoPrompt(value)}
                    onSelectFromHistory={handleSelectFromHistory}
                    aspectRatio="16:9"
                    onAspectRatioChange={() => {}}
                  />
                </div>
                <div className="flex-1">
                  <ProductImageGrid 
                    images={allProductImages}
                    onSelectImage={handleSelectFromHistory}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faceless-video" className="h-[calc(100%-3rem)] overflow-hidden">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
