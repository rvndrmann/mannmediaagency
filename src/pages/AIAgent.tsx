
import { useNavigate } from "react-router-dom";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplitScreen } from "@/components/ai-agent/SplitScreen";
import { useProductShotV1, ImageSize } from "@/hooks/use-product-shot-v1";
import { useUserCredits } from "@/hooks/use-user-credits";
import { useImageToVideo } from "@/hooks/use-image-to-video";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const userCreditsQuery = useUserCredits();
  const [activeTool, setActiveTool] = useState('product-shot-v1');
  const [commandParams, setCommandParams] = useState<any>(null);

  // Handle tool switching from AI chat commands with parameters
  const handleToolSwitch = (tool: string, params?: any) => {
    console.log("Switching to tool:", tool, "with params:", params);
    setActiveTool(tool);
    setCommandParams(params || null);
  };

  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    userCredits
  } = useAIChat(handleToolSwitch);

  const { 
    isGenerating: isGeneratingV2, 
    isSubmitting: isSubmittingV2, 
    generatedImages: generatedImagesV2, 
    handleGenerate: handleGenerateV2
  } = useProductShoot();

  const { state: productShotState, actions: productShotActions } = useProductShotV1({
    user_id: userCreditsQuery.data?.user_id || '',
    credits_remaining: userCreditsQuery.data?.credits_remaining || 0
  });

  const {
    isGenerating: isGeneratingVideo,
    previewUrl: videoPreviewUrl,
    handleFileSelect: handleVideoFileSelect,
    handleClearFile: handleVideoClearFile,
    handleGenerate: handleVideoGenerate,
    handleSelectFromHistory: handleVideoSelectFromHistory,
  } = useImageToVideo();

  // Effect to handle command parameters for product-shot-v1
  useEffect(() => {
    if (commandParams && activeTool === 'product-shot-v1') {
      // Set prompt if provided
      if (commandParams.prompt) {
        productShotActions.setProductShotPrompt(commandParams.prompt);
      }
      
      // Set image if provided
      if (commandParams.imageUrl) {
        productShotActions.setProductShotPreview(commandParams.imageUrl);
      }
      
      // Auto-generate if flag is set
      if (commandParams.autoGenerate) {
        setTimeout(() => {
          productShotActions.handleGenerate();
        }, 500); // Small delay to ensure UI is updated
      }
      
      // Clear parameters after processing
      setCommandParams(null);
    }
  }, [commandParams, activeTool, productShotActions]);

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <TooltipProvider>
        <div className="min-h-screen bg-[#1A1F2C]">
          {isMobile && (
            <div className="fixed top-0 left-0 z-50 p-4">
              <Button 
                variant="gradient" 
                size="sm" 
                onClick={handleBackClick}
                className="text-white shadow-md"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                <span className="font-medium">Back</span>
              </Button>
            </div>
          )}
          
          <div className="h-screen">
            <SplitScreen
              isMobile={isMobile}
              messages={messages}
              input={input}
              isLoading={isLoading}
              userCredits={userCredits}
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              productShotV2={{
                onSubmit: handleGenerateV2,
                isGenerating: isGeneratingV2,
                isSubmitting: isSubmittingV2,
                availableCredits: userCreditsQuery.data?.credits_remaining || 0,
                generatedImages: generatedImagesV2,
                messages: messages
              }}
              productShotV1={{
                isMobile,
                prompt: productShotState.productShotPrompt,
                previewUrl: productShotState.productShotPreview,
                imageSize: productShotState.imageSize,
                inferenceSteps: productShotState.inferenceSteps,
                guidanceScale: productShotState.guidanceScale,
                outputFormat: productShotState.outputFormat,
                productImages: productShotState.productImages || [],
                imagesLoading: productShotState.imagesLoading,
                creditsRemaining: userCreditsQuery.data?.credits_remaining || 0,
                isGenerating: productShotState.isGenerating,
                onPromptChange: productShotActions.setProductShotPrompt,
                onFileSelect: productShotActions.handleFileSelect,
                onClearFile: productShotActions.handleClearFile,
                onImageSizeChange: productShotActions.setImageSize,
                onInferenceStepsChange: productShotActions.setInferenceSteps,
                onGuidanceScaleChange: productShotActions.setGuidanceScale,
                onOutputFormatChange: productShotActions.setOutputFormat,
                onGenerate: productShotActions.handleGenerate,
                onDownload: (url: string) => {
                  window.open(url, '_blank');
                },
                messages
              }}
              imageToVideo={{
                isMobile,
                previewUrl: videoPreviewUrl,
                onFileSelect: handleVideoFileSelect,
                onClearFile: handleVideoClearFile,
                creditsRemaining: userCreditsQuery.data?.credits_remaining || 0,
                isGenerating: isGeneratingVideo,
                onGenerate: handleVideoGenerate,
                onSelectFromHistory: handleVideoSelectFromHistory,
              }}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onBack={handleBackClick}
            />
          </div>
          <Toaster />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default AIAgent;
