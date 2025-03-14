
import { useState, useEffect } from "react";
import { SplitScreen } from "@/components/ai-agent/SplitScreen";
import { Header } from "@/components/ai-agent/Header";
import { MobileToolNav } from "@/components/ai-agent/MobileToolNav";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { useProductShotV1 } from "@/hooks/use-product-shot-v1";
import { useImageToVideo } from "@/hooks/use-image-to-video";
import { useIsMobile } from "@/hooks/use-mobile";
import { VideoTemplatesDialog } from "@/components/ai-agent/VideoTemplatesDialog";
import { CustomOrderDialog } from "@/components/ai-agent/CustomOrderDialog";
import { AISettingsDialog } from "@/components/ui/ai-settings-dialog";
import { useNavigate } from "react-router-dom";
import { HeaderNotificationBell } from "@/components/messages/HeaderNotificationBell";

export default function AIAgent() {
  const [activeTool, setActiveTool] = useState<string>("ai-agent");
  const [showVideoTemplatesDialog, setShowVideoTemplatesDialog] = useState(false);
  const [showCustomOrderDialog, setShowCustomOrderDialog] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const { 
    messages, 
    input, 
    setInput, 
    isLoading, 
    handleSubmit, 
    userCredits, 
    useAssistantsApi,
    setUseAssistantsApi,
    useMcp,
    setUseMcp
  } = useAIChat();
  
  const productShootV2 = useProductShoot();
  const productShotV1 = useProductShotV1();
  const imageToVideo = useImageToVideo();
  
  const { 
    state: productShotV1State,
    actions: productShotV1Actions
  } = useProductShotV1();
  
  const handleToolSelect = (tool: string) => {
    setActiveTool(tool);
  };
  
  const handleBack = () => {
    if (activeTool !== "ai-agent") {
      setActiveTool("ai-agent");
    } else {
      navigate("/");
    }
  };
  
  const handleVideoTemplatesClick = () => {
    setShowVideoTemplatesDialog(true);
  };
  
  const handleCustomOrderClick = () => {
    navigate("/custom-orders");
  };
  
  const handleSelectTemplate = (template: any, imageUrl: string) => {
    // Placeholder for template selection handling
    setShowVideoTemplatesDialog(false);
  };
  
  // Reset to default tool on desktop
  useEffect(() => {
    if (!isMobile && activeTool !== "ai-agent") {
      setActiveTool("ai-agent");
    }
  }, [isMobile]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#1A1F29]">
      <Header 
        onBack={handleBack} 
        title={activeTool === "ai-agent" ? "Chat" : ""}
        rightElement={<HeaderNotificationBell />}
      />
      
      <div className="flex-1 overflow-hidden">
        <SplitScreen
          isMobile={isMobile}
          messages={messages}
          input={input}
          isLoading={isLoading}
          userCredits={userCredits}
          activeTool={activeTool}
          onToolSelect={handleToolSelect}
          onVideoTemplatesClick={handleVideoTemplatesClick}
          productShotV2={{
            onSubmit: productShootV2.handleGenerate,
            isGenerating: productShootV2.isGenerating,
            isSubmitting: productShootV2.isSubmitting,
            availableCredits: userCredits?.credits_remaining || 0,
            generatedImages: productShootV2.generatedImages,
            messages: messages
          }}
          productShotV1={{
            isMobile: isMobile,
            prompt: productShotV1State.productShotPrompt,
            previewUrl: productShotV1State.productShotPreview,
            imageSize: productShotV1State.imageSize,
            inferenceSteps: productShotV1State.inferenceSteps,
            guidanceScale: productShotV1State.guidanceScale,
            outputFormat: productShotV1State.outputFormat,
            productImages: productShotV1State.productImages,
            imagesLoading: productShotV1State.imagesLoading,
            creditsRemaining: userCredits?.credits_remaining || 0,
            isGenerating: productShotV1State.isGenerating,
            onPromptChange: productShotV1Actions.setProductShotPrompt,
            onFileSelect: productShotV1Actions.handleFileSelect,
            onClearFile: () => productShotV1Actions.setProductShotPreview(null),
            onImageSizeChange: productShotV1Actions.setImageSize,
            onInferenceStepsChange: productShotV1Actions.setInferenceSteps,
            onGuidanceScaleChange: productShotV1Actions.setGuidanceScale,
            onOutputFormatChange: productShotV1Actions.setOutputFormat,
            onGenerate: () => productShotV1Actions.generateImage(productShotV1State.productShotPrompt),
            onDownload: (url: string) => productShotV1Actions.downloadImage(url, "product-shot"),
            messages: messages,
            onVideoTemplatesClick: handleVideoTemplatesClick
          }}
          imageToVideo={{
            isMobile: isMobile,
            previewUrl: imageToVideo.previewUrl,
            onFileSelect: imageToVideo.handleFileSelect,
            onClearFile: imageToVideo.handleClearFile,
            creditsRemaining: userCredits?.credits_remaining || 0,
            isGenerating: imageToVideo.isGenerating,
            onGenerate: imageToVideo.handleGenerate,
            onSelectFromHistory: imageToVideo.handleSelectFromHistory
          }}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onBack={handleBack}
          onCustomOrderClick={handleCustomOrderClick}
          useAssistantsApi={useAssistantsApi}
          setUseAssistantsApi={setUseAssistantsApi}
          useMcp={useMcp}
          setUseMcp={setUseMcp}
        />
      </div>
      
      {isMobile && (
        <MobileToolNav
          activeTool={activeTool}
          onToolSelect={handleToolSelect}
          onCustomOrderClick={handleCustomOrderClick}
        />
      )}
      
      <VideoTemplatesDialog
        open={showVideoTemplatesDialog}
        onOpenChange={setShowVideoTemplatesDialog}
        onSelectTemplate={handleSelectTemplate}
        sourceImageUrl={productShotV1State.productShotPreview || ""}
        userCredits={userCredits?.credits_remaining || 0}
      />
    </div>
  );
}
