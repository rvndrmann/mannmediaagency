
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

export default function AIAgent() {
  const [activeTool, setActiveTool] = useState<string>("ai-agent");
  const [showVideoTemplatesDialog, setShowVideoTemplatesDialog] = useState(false);
  const [showCustomOrderDialog, setShowCustomOrderDialog] = useState(false);
  const isMobile = useIsMobile();
  
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
  
  const productShotV2 = useProductShoot();
  const productShotV1 = useProductShotV1();
  const imageToVideo = useImageToVideo();
  
  const handleToolSelect = (tool: string) => {
    setActiveTool(tool);
  };
  
  const handleBack = () => {
    setActiveTool("ai-agent");
  };
  
  const handleVideoTemplatesClick = () => {
    setShowVideoTemplatesDialog(true);
  };
  
  const handleCustomOrderClick = () => {
    setShowCustomOrderDialog(true);
  };
  
  // Reset to default tool on desktop
  useEffect(() => {
    if (!isMobile && activeTool !== "ai-agent") {
      setActiveTool("ai-agent");
    }
  }, [isMobile]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <Header />
      
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
          productShotV2={productShotV2}
          productShotV1={productShotV1}
          imageToVideo={imageToVideo}
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
        />
      )}
      
      <VideoTemplatesDialog
        open={showVideoTemplatesDialog}
        onOpenChange={setShowVideoTemplatesDialog}
        onSelectTemplate={() => {}}
        sourceImageUrl={productShotV1.previewUrl || ""}
        userCredits={userCredits?.credits_remaining || 0}
      />
      
      <CustomOrderDialog
        open={showCustomOrderDialog}
        onOpenChange={setShowCustomOrderDialog}
      />
    </div>
  );
}
