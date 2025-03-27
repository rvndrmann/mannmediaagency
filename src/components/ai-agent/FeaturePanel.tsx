
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { FacelessVideoForm } from "@/components/video/FacelessVideoForm";
import { useState } from "react";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";
import { ImageSize } from "@/hooks/use-product-shot-v1";
import { ensureGlobalMessages } from "@/utils/messageTypeAdapter";

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
    imageSize: ImageSize;
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
    onImageSizeChange: (value: ImageSize) => void;
    onInferenceStepsChange: (value: number) => void;
    onGuidanceScaleChange: (value: number) => void;
    onOutputFormatChange: (value: string) => void;
    onGenerate: () => void;
    onDownload: (url: string) => void;
    messages: Message[];
    onVideoTemplatesClick?: () => void;
  };
  imageToVideo: {
    isMobile: boolean;
    previewUrl: string | null;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    creditsRemaining: number;
    isGenerating: boolean;
    onGenerate: (prompt: string, aspectRatio: string) => void;
    onSelectFromHistory?: (jobId: string, imageUrl: string) => void;
  };
  activeTool: string;
}

export function FeaturePanel({ messages, productShotV2, productShotV1, imageToVideo, activeTool }: FeaturePanelProps) {
  const [imageToVideoPrompt, setImageToVideoPrompt] = useState("");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("9:16");

  // Ensure messages are properly formatted
  const formattedMessages = ensureGlobalMessages(messages);

  return (
    <div className="bg-[#1A1F29] h-full overflow-hidden">
      <Tabs value={activeTool} className="h-[calc(100vh-8rem)]">
        <TabsContent value="product-shot-v1" className="h-full overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            <InputPanel
              isMobile={productShotV1.isMobile}
              prompt={productShotV1.prompt}
              previewUrl={productShotV1.previewUrl}
              imageSize={productShotV1.imageSize}
              inferenceSteps={productShotV1.inferenceSteps}
              guidanceScale={productShotV1.guidanceScale}
              outputFormat={productShotV1.outputFormat}
              creditsRemaining={productShotV1.creditsRemaining}
              isGenerating={productShotV1.isGenerating}
              onPromptChange={productShotV1.onPromptChange}
              onFileSelect={productShotV1.onFileSelect}
              onClearFile={productShotV1.onClearFile}
              onImageSizeChange={productShotV1.onImageSizeChange}
              onInferenceStepsChange={productShotV1.onInferenceStepsChange}
              onGuidanceScaleChange={productShotV1.onGuidanceScaleChange}
              onOutputFormatChange={productShotV1.onOutputFormatChange}
              onGenerate={productShotV1.onGenerate}
              messages={productShotV1.messages}
              onVideoTemplatesClick={productShotV1.onVideoTemplatesClick}
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
                  messages={formattedMessages as any}
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
            prompt={imageToVideoPrompt}
            onPromptChange={setImageToVideoPrompt}
            messages={formattedMessages as any}
            aspectRatio={selectedAspectRatio}
            onAspectRatioChange={setSelectedAspectRatio}
            onSelectFromHistory={imageToVideo.onSelectFromHistory || ((jobId, imageUrl) => {})}
          />
        </TabsContent>

        <TabsContent value="faceless-video" className="h-[calc(100%-3rem)] overflow-y-auto">
          <FacelessVideoForm
            messages={formattedMessages as any}
            creditsRemaining={productShotV1.creditsRemaining}
          />
        </TabsContent>

        <TabsContent value="script-builder" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ScriptBuilderTab messages={formattedMessages as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
