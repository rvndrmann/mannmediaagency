
import { useNavigate } from "react-router-dom";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplitScreen } from "@/components/ai-agent/SplitScreen";
import { useProductShotV1, ImageSize } from "@/hooks/use-product-shot-v1";
import { useUserCredits } from "@/hooks/use-user-credits";
import { useImageToVideo } from "@/hooks/use-image-to-video";
import { useTemplateVideo } from "@/hooks/use-template-video";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CustomOrderDialog } from "@/components/ai-agent/CustomOrderDialog";
import { VideoTemplatesDialog } from "@/components/ai-agent/VideoTemplatesDialog";
import { VideoTemplate } from "@/types/custom-order";

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const userCreditsQuery = useUserCredits();
  const [activeTool, setActiveTool] = useState('product-shot-v1');
  const [commandParams, setCommandParams] = useState<any>(null);
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [videoTemplatesOpen, setVideoTemplatesOpen] = useState(false);

  // Store active tool in localStorage for cross-component state sharing
  useEffect(() => {
    localStorage.setItem("activeTool", activeTool);
  }, [activeTool]);

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

  const {
    isGenerating: isGeneratingTemplateVideo,
    generateFromTemplate
  } = useTemplateVideo();

  // Effect to handle command parameters for product-shot-v1
  useEffect(() => {
    if (commandParams && activeTool === 'product-shot-v1') {
      console.log("Applying command parameters to product-shot-v1:", commandParams);
      
      // Set prompt if provided
      if (commandParams.prompt) {
        productShotActions.setProductShotPrompt(commandParams.prompt);
      }
      
      // Set image if provided - use direct method for remote/default images
      if (commandParams.imageUrl) {
        console.log("Setting default image URL:", commandParams.imageUrl);
        productShotActions.setProductShotPreview(commandParams.imageUrl);
        toast.success(`Using default image: ${commandParams.name || 'Unnamed'}`);
      }
      
      // Auto-generate if flag is set
      if (commandParams.autoGenerate) {
        console.log("Auto-generating product shot");
        // Use a slightly longer delay to ensure UI is fully updated
        setTimeout(() => {
          try {
            console.log("Triggering handleGenerate");
            productShotActions.handleGenerate();
            toast.success("Automatically generating your product shot");
          } catch (error) {
            console.error("Error auto-generating:", error);
            toast.error("Failed to auto-generate product shot");
          }
        }, 1000); // Longer delay to ensure all UI state is updated
      }
      
      // Clear parameters after processing
      setCommandParams(null);
    }
  }, [commandParams, activeTool, productShotActions]);

  const handleBackClick = () => {
    navigate('/');
  };

  const handleCustomOrderClick = () => {
    setCustomOrderOpen(true);
  };

  const handleVideoTemplatesClick = () => {
    if (!productShotState.productShotPreview) {
      toast.error("Please generate or upload an image first");
      return;
    }
    setVideoTemplatesOpen(true);
  };

  const handleTemplateSelect = async (template: VideoTemplate, imageUrl: string) => {
    if (!userCreditsQuery.data?.user_id) {
      toast.error("Please log in to use templates");
      return;
    }

    const jobId = await generateFromTemplate(
      template, 
      imageUrl, 
      userCreditsQuery.data.user_id
    );

    if (jobId) {
      toast.success("Video generation started, you can view it in the video gallery");
      if (activeTool !== 'image-to-video') {
        setActiveTool('image-to-video');
      }
    }
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
              onVideoTemplatesClick={handleVideoTemplatesClick}
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
                messages,
                onVideoTemplatesClick: handleVideoTemplatesClick
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
              onCustomOrderClick={handleCustomOrderClick}
            />
          </div>
          <CustomOrderDialog 
            open={customOrderOpen} 
            onOpenChange={setCustomOrderOpen} 
          />
          <VideoTemplatesDialog
            open={videoTemplatesOpen}
            onOpenChange={setVideoTemplatesOpen}
            onSelectTemplate={handleTemplateSelect}
            sourceImageUrl={productShotState.productShotPreview}
            userCredits={userCreditsQuery.data?.credits_remaining || 0}
          />
          <Toaster />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default AIAgent;
