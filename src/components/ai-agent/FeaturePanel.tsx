
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { useState, useEffect, useRef } from "react";
import { GeneratedImage } from "@/types/product-shoot";
import { Message } from "@/types/message";
import { useToast } from "@/hooks/use-toast";

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
  onSetVideoSubmitFunction?: (fn: () => void) => void;
}

export function FeaturePanel({ 
  messages, 
  productShotV2, 
  productShotV1, 
  imageToVideo, 
  activeTool,
  onSetVideoSubmitFunction
}: FeaturePanelProps) {
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(true);
  const { toast } = useToast();
  
  // Refs for holding form values
  const scriptRef = useRef("");
  const styleRef = useRef("Explainer");
  const readyToGoRef = useRef(false);
  const backgroundMusicRef = useRef<string | null>(null);
  const productPhotoRef = useRef<string | null>(null);
  
  // For initial script, we can use the last AI message content if available
  const getInitialScript = () => {
    if (!messages || messages.length === 0) return "";
    
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");
      
    return lastAssistantMessage?.content || "";
  };
  
  // Create our video submission function and expose it to parent
  const handleVideoSubmit = () => {
    // Check if we have a script first
    if (!scriptRef.current || scriptRef.current.trim() === "") {
      toast({
        title: "Script Required",
        description: "Please enter a script before creating a video.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the submit button in our form
    const submitButton = document.querySelector('.CreateVideoDialogSubmitButton') as HTMLButtonElement;
    if (submitButton) {
      submitButton.click();
    } else {
      // If we can't find the button, we can try to submit programmatically
      const videoForm = document.querySelector('.faceless-video-form') as HTMLFormElement;
      if (videoForm) {
        // Dispatch a submit event on the form
        const event = new Event('submit', { bubbles: true, cancelable: true });
        videoForm.dispatchEvent(event);
      }
    }
  };
  
  // Update script reference when script changes
  const handleScriptChange = (value: string) => {
    scriptRef.current = value;
  };
  
  // Update style reference when style changes
  const handleStyleChange = (value: string) => {
    styleRef.current = value;
  };
  
  // Update readyToGo reference when it changes
  const handleReadyToGoChange = (value: boolean) => {
    readyToGoRef.current = value;
  };
  
  // Expose the video submit function to parent
  useEffect(() => {
    if (onSetVideoSubmitFunction) {
      onSetVideoSubmitFunction(handleVideoSubmit);
    }
  }, [onSetVideoSubmitFunction]);

  return (
    <Card className="bg-[#1A1F2C] border-gray-800 shadow-lg overflow-hidden">
      <Tabs value={activeTool} className="h-[calc(100vh-8rem)]">
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
        </TabsContent>

        <TabsContent value="faceless-video" className="h-[calc(100%-3rem)] overflow-y-auto">
          <div className="p-6">
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
          </div>
        </TabsContent>

        <TabsContent value="script-builder" className="h-[calc(100%-3rem)] overflow-y-auto">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
