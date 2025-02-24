
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { GalleryPanel as ImageToVideoGalleryPanel } from "@/components/image-to-video/GalleryPanel";

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
    <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4">
      <Tabs defaultValue="faceless-video" className="h-[calc(100vh-8rem)]">
        <TabsList className="w-full bg-[#333333] mb-4">
          <TabsTrigger 
            value="faceless-video" 
            className="flex-1 text-white data-[state=active]:bg-[#444444]"
          >
            Faceless Video
          </TabsTrigger>
          <TabsTrigger 
            value="image-to-video" 
            className="flex-1 text-white data-[state=active]:bg-[#444444]"
          >
            Image to Video
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

        <TabsContent value="faceless-video" className="h-[calc(100%-3rem)] overflow-hidden">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>

        <TabsContent value="image-to-video" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex h-full gap-4 bg-[#1A1F2C] rounded-lg">
            <ImageToVideoInputPanel
              isMobile={productShotV1.isMobile}
              prompt={productShotV1.prompt}
              onPromptChange={productShotV1.onPromptChange}
              previewUrl={productShotV1.previewUrl}
              onFileSelect={productShotV1.onFileSelect}
              onClearFile={productShotV1.onClearFile}
              onSelectFromHistory={(jobId, imageUrl) => console.log(jobId, imageUrl)}
              onGenerate={productShotV1.onGenerate}
              isGenerating={false}
              creditsRemaining={productShotV1.creditsRemaining}
              aspectRatio="16:9"
              onAspectRatioChange={() => {}}
            />
            <ImageToVideoGalleryPanel 
              isMobile={productShotV1.isMobile}
              videos={[]}
              isLoading={false}
              onDownload={productShotV1.onDownload}
            />
          </div>
        </TabsContent>

        <TabsContent value="product-shot-v2" className="h-[calc(100%-3rem)] overflow-hidden">
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

        <TabsContent value="product-shot-v1" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex h-full gap-4 bg-[#1A1F2C] rounded-lg">
            <div className="w-1/3 min-w-[320px] border-r border-white/10">
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
        </TabsContent>
      </Tabs>
    </Card>
  );
}
