
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";

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
  return (
    <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4 h-[calc(100vh-8rem)]">
      <Tabs defaultValue="script" className="flex-1 h-full">
        <TabsList className="w-full bg-[#333333] mb-4">
          <TabsTrigger 
            value="script" 
            className="flex-1 text-white data-[state=active]:bg-[#444444]"
          >
            Video Script
          </TabsTrigger>
          <TabsTrigger 
            value="product-shot-v2" 
            className="flex-1 text-white data-[state=active]:bg-[#444444]"
          >
            Product Shot V2
          </TabsTrigger>
          <TabsTrigger 
            value="product-shot-v1" 
            className="flex-1 text-white data-[state=active]:bg-[#444444]"
          >
            Product Shot V1
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="h-full">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>

        <TabsContent value="product-shot-v2" className="h-full">
          <div className="space-y-6">
            <ProductShotForm 
              onSubmit={productShotV2.onSubmit}
              isGenerating={productShotV2.isGenerating}
              isSubmitting={productShotV2.isSubmitting}
              availableCredits={productShotV2.availableCredits}
            />
            {productShotV2.generatedImages.length > 0 && (
              <GeneratedImagesPanel 
                images={productShotV2.generatedImages}
                isGenerating={productShotV2.isGenerating}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="product-shot-v1" className="h-full">
          <div className="flex flex-col h-full">
            <InputPanel
              isMobile={productShotV1.isMobile}
              prompt={productShotV1.prompt}
              onPromptChange={productShotV1.onPromptChange}
              previewUrl={productShotV1.previewUrl}
              onFileSelect={productShotV1.onFileSelect}
              onClearFile={productShotV1.onClearFile}
              imageSize={productShotV1.imageSize}
              onImageSizeChange={productShotV1.onImageSizeChange}
              inferenceSteps={productShotV1.inferenceSteps}
              onInferenceStepsChange={productShotV1.onInferenceStepsChange}
              guidanceScale={productShotV1.guidanceScale}
              onGuidanceScaleChange={productShotV1.onGuidanceScaleChange}
              outputFormat={productShotV1.outputFormat}
              onOutputFormatChange={productShotV1.onOutputFormatChange}
              onGenerate={productShotV1.onGenerate}
              isGenerating={false}
              creditsRemaining={productShotV1.creditsRemaining}
            />
            {productShotV1.productImages && productShotV1.productImages.length > 0 && (
              <div className="mt-4 flex-1">
                <GalleryPanel 
                  isMobile={productShotV1.isMobile}
                  images={productShotV1.productImages}
                  isLoading={productShotV1.imagesLoading}
                  onDownload={productShotV1.onDownload}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
