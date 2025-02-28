
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { GenerateButton } from "./GenerateButton";
import { FileText } from "lucide-react";
import { useState } from "react";
import { Message } from "@/types/message";

interface FacelessVideoPanelProps {
  productShotV1: {
    creditsRemaining: number;
  };
  messages: Message[];
}

export const FacelessVideoPanel = ({ productShotV1, messages }: FacelessVideoPanelProps) => {
  const [isVideoDialogOpen] = useState(true);
  
  // For initial script, we can use the last AI message content if available
  const getInitialScript = () => {
    if (!messages || messages.length === 0) return "";
    
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");
      
    return lastAssistantMessage?.content || "";
  };

  const handleCreateVideo = () => {
    const submitButton = document.querySelector('.faceless-video-form button[type="submit"]') as HTMLButtonElement;
    if (submitButton) submitButton.click();
  };

  return (
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
      <GenerateButton 
        onClick={handleCreateVideo}
        icon={<FileText className="mr-2 h-4 w-4" />}
        label="Create Video"
        creditCost="20 credits"
        position="fixed"
      />
    </div>
  );
};
