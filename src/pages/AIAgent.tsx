import { useNavigate } from "react-router-dom";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplitScreen } from "@/components/ai-agent/SplitScreen";
import { useProductShotV1 } from "@/hooks/use-product-shot-v1";
import { useUserCredits } from "@/hooks/use-user-credits";
import { useChatHandler } from "@/hooks/use-chat-handler";
import { useImageToVideo } from "@/hooks/use-image-to-video";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const userCreditsQuery = useUserCredits();

  const {
    input,
    setInput,
    isLoading,
    userCredits
  } = useAIChat();

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

  const { messages, handleSubmit } = useChatHandler(setInput);

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <TooltipProvider>
        <div className="min-h-screen bg-[#1A1F2C]">
          {/* Enhanced back button for mobile view */}
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
                isGenerating: isLoading,
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
                }
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
              onSubmit={(e) => handleSubmit(e, input)}
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
