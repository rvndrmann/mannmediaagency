
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatSection } from "./ChatSection";
import { FeaturePanel } from "./FeaturePanel";
import { MobileToolNav, tools } from "./MobileToolNav";
import { ToolSelector } from "./ToolSelector";
import { MobileToolsGrid } from "./MobileToolsGrid";
import { MobileAgentButton } from "./MobileAgentButton";
import { SplitScreenProps } from "./types";

export const SplitScreen = ({
  isMobile,
  messages,
  input,
  isLoading,
  userCredits,
  productShotV2,
  productShotV1,
  imageToVideo,
  onInputChange,
  onSubmit,
}: SplitScreenProps) => {
  const [activeTool, setActiveTool] = useState('product-shot-v1');
  const [showChat, setShowChat] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleToolSelect = (tool: string) => {
    setIsTransitioning(true);
    if (tool === 'ai-agent') {
      setShowChat(true);
    } else {
      setActiveTool(tool);
      setShowChat(false);
    }
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div className="relative min-h-screen h-full bg-[#1A1F2C]">
      <div 
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          isMobile ? "" : "flex h-screen"
        )}
      >
        {/* Chat Section */}
        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out h-full",
            isMobile ? (
              showChat 
                ? "fixed inset-0 z-50 animate-in fade-in slide-in" 
                : "hidden"
            ) : (
              "relative w-[50%] border-r border-white/10 overflow-hidden"
            )
          )}
        >
          <ChatSection
            messages={messages}
            input={input}
            isLoading={isLoading}
            userCredits={userCredits}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            isMobile={isMobile}
          />
        </div>

        {/* Feature Panel */}
        <div 
          className={cn(
            "bg-[#1A1F2C] transition-all duration-300 ease-in-out h-full",
            isMobile ? (
              // Always show the feature panel, even when chat is visible
              // Just adjust the opacity during transitions
              cn("pb-32", isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100")
            ) : "flex-1 overflow-hidden"
          )}
        >
          {!isMobile && (
            <ToolSelector 
              activeTool={activeTool}
              onToolSelect={setActiveTool}
            />
          )}
          
          {/* Tools Grid for Mobile */}
          {isMobile && !showChat && (
            <MobileToolsGrid 
              activeTool={activeTool} 
              onToolSelect={handleToolSelect}
            />
          )}
          
          {/* AI Agent Button for Mobile */}
          {isMobile && !showChat && (
            <MobileAgentButton onToolSelect={handleToolSelect} />
          )}
          
          <FeaturePanel
            messages={messages}
            productShotV2={productShotV2}
            productShotV1={productShotV1}
            imageToVideo={imageToVideo}
            activeTool={activeTool}
          />
        </div>
      </div>

      {isMobile && (
        <MobileToolNav
          activeTool={showChat ? 'ai-agent' : activeTool}
          onToolSelect={handleToolSelect}
        />
      )}
    </div>
  );
};
