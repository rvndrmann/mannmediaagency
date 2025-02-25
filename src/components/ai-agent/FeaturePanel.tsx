import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { UseAIResponseButton } from "./features/UseAIResponseButton";
import { useState } from "react";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";

interface FeaturePanelProps {
  messages: Message[];
  productShotV2: {
    onSubmit: (formData: any) => Promise<void>;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: GeneratedImage[];
  };
  productShotV1: {
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
    onPromptChange: (prompt: string) => void;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    onImageSizeChange: (size: string) => void;
    onInferenceStepsChange: (steps: number) => void;
    onGuidanceScaleChange: (scale: number) => void;
    onOutputFormatChange: (format: string) => void;
    onGenerate: () => void;
    onDownload: (url: string) => void;
  };
  imageToVideo: {
    isMobile: boolean;
    previewUrl: string | null;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    creditsRemaining: number;
    isGenerating: boolean;
    onGenerate: () => void;
  };
  activeTool: string;
}

export function FeaturePanel({ messages, productShotV2, productShotV1, imageToVideo, activeTool }: FeaturePanelProps) {
  const [imageToVideoPrompt, setImageToVideoPrompt] = useState("");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("16:9");

  const handleUseAIResponse = (response: string) => {
    if (activeTool === "product-shot-v1") {
      productShotV1.onPromptChange(response);
    } else if (activeTool === "product-shot-v2") {
      // handle product shot v2
    } else if (activeTool === "image-to-video") {
      setImageToVideoPrompt(response);
    }
  };

  return (
    <Card className="bg-[#1A1F2C] border-gray-800 shadow-lg overflow-hidden">
      <Tabs value={activeTool} className="h-[calc(100vh-8rem)]">
        <div className="p-4 border-b border-gray-800">
          <UseAIResponseButton 
            messages={messages}
            onUseResponse={handleUseAIResponse}
          />
        </div>

        <TabsContent value="product-shot-v1" className="h-[calc(100%-3rem)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            <InputPanel
              {...productShotV1}
              messages={messages}
            />
            <GalleryPanel
              isMobile={productShotV1.isMobile}
              images={productShotV1.productImages}
              isLoading={productShotV1.imagesLoading}
              onDownload={productShotV1.onDownload}
            />
          </div>
        </TabsContent>

        <TabsContent value="product-shot-v2" className="h-[calc(100%-3rem)] overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6 min-h-[calc(100vh-16rem)]">
                <ProductShotForm
                  {...productShotV2}
                  messages={messages}
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
        </TabsContent>

        <TabsContent value="image-to-video" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ImageToVideoInputPanel
            {...imageToVideo}
            messages={messages}
          />
        </TabsContent>

        <TabsContent value="script-builder" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
