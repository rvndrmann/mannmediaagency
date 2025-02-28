
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";
import { Camera, Video, RefreshCw, FileText } from "lucide-react";

interface FeaturePanelProps {
  messages: Message[];
  productShotV2: {
    onSubmit: (formData: any) => Promise<void>;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: GeneratedImage[];
    messages: Message[];
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
    onPromptChange: (value: string) => void;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    onImageSizeChange: (value: string) => void;
    onInferenceStepsChange: (value: number) => void;
    onGuidanceScaleChange: (value: number) => void;
    onOutputFormatChange: (value: string) => void;
    onGenerate: () => void;
    onDownload: (url: string) => void;
  };
  imageToVideo: {
    isMobile: boolean;
    previewUrl: string | null;
    prompt: string;
    aspectRatio: string;
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
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(true);
  
  // For initial script, we can use the last AI message content if available
  const getInitialScript = () => {
    if (!messages || messages.length === 0) return "";
    
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");
      
    return lastAssistantMessage?.content || "";
  };

  // Add generate buttons for each tool
  const renderProductShotV1GenerateButton = () => {
    if (!productShotV1.prompt || !productShotV1.previewUrl || productShotV1.isGenerating) return null;
    
    return (
      <div className="fixed md:relative bottom-20 md:bottom-auto left-0 right-0 p-4 z-10">
        <Button 
          onClick={productShotV1.onGenerate}
          disabled={productShotV1.isGenerating}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Camera className="mr-2 h-4 w-4" />
          Generate Image ({productShotV1.creditsRemaining > 0 ? "0.2 credits" : "Insufficient credits"})
        </Button>
      </div>
    );
  };

  const renderImageToVideoGenerateButton = () => {
    if (!imageToVideo.prompt || !imageToVideo.previewUrl || imageToVideo.isGenerating) return null;
    
    return (
      <div className="fixed md:relative bottom-20 md:bottom-auto left-0 right-0 p-4 z-10">
        <Button 
          onClick={() => imageToVideo.onGenerate(imageToVideo.prompt, imageToVideo.aspectRatio)}
          disabled={imageToVideo.isGenerating}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Video className="mr-2 h-4 w-4" />
          Generate Video (1 credit)
        </Button>
      </div>
    );
  };

  const renderFacelessVideoGenerateButton = () => {
    return (
      <div className="fixed md:relative bottom-20 md:bottom-auto left-0 right-0 p-4 z-10">
        <Button 
          onClick={() => {
            const submitButton = document.querySelector('.faceless-video-form button[type="submit"]') as HTMLButtonElement;
            if (submitButton) submitButton.click();
          }}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          <FileText className="mr-2 h-4 w-4" />
          Create Video (20 credits)
        </Button>
      </div>
    );
  };

  return (
    <Card className="bg-[#1A1F2C] border-gray-800 shadow-lg overflow-hidden">
      <Tabs value={activeTool} className="h-[calc(100vh-8rem)]">
        <TabsContent value="product-shot-v1" className="h-[calc(100%-3rem)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 relative">
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
            {renderProductShotV1GenerateButton()}
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
          <div className="relative h-full">
            <ImageToVideoInputPanel
              isMobile={imageToVideo.isMobile}
              prompt={imageToVideo.prompt}
              onPromptChange={(newPrompt) => {
                // This is a pass-through since we don't have direct access to setPrompt
                if (imageToVideo.onGenerate) {
                  // We'll just update in the parent component when generating
                }
              }}
              previewUrl={imageToVideo.previewUrl}
              onFileSelect={imageToVideo.onFileSelect}
              onClearFile={imageToVideo.onClearFile}
              onSelectFromHistory={imageToVideo.onSelectFromHistory || ((jobId, imageUrl) => {})}
              onGenerate={imageToVideo.onGenerate}
              isGenerating={imageToVideo.isGenerating}
              creditsRemaining={imageToVideo.creditsRemaining}
              aspectRatio={imageToVideo.aspectRatio}
              onAspectRatioChange={(newAspectRatio) => {
                // This is a pass-through since we don't have direct access to setAspectRatio
                if (imageToVideo.onGenerate) {
                  // We'll just update in the parent component when generating
                }
              }}
              messages={messages}
            />
            {renderImageToVideoGenerateButton()}
          </div>
        </TabsContent>

        <TabsContent value="faceless-video" className="h-[calc(100%-3rem)] overflow-y-auto">
          <div className="p-6 relative">
            <CreateVideoDialog
              isOpen={isVideoDialogOpen}
              onClose={() => {}} // We don't actually close this dialog in the panel context
              availableVideos={Math.floor((productShotV1.creditsRemaining || 0) / 20)}
              creditsRemaining={productShotV1.creditsRemaining}
              initialScript={getInitialScript()}
              initialStyle="Explainer"
              embeddedMode={true} // Add a flag for embedded mode styling
              messages={messages}
            />
            {renderFacelessVideoGenerateButton()}
          </div>
        </TabsContent>

        <TabsContent value="script-builder" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
