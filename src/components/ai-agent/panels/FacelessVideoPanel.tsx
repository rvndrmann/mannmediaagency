
import { useState } from "react";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { GenerateButton } from "./GenerateButton";
import { FileText } from "lucide-react";
import { Message } from "@/types/message";

interface FacelessVideoPanelProps {
  productShotV1: {
    creditsRemaining: number;
  };
  messages: Message[];
}

export const FacelessVideoPanel = ({ productShotV1, messages }: FacelessVideoPanelProps) => {
  const [isVideoDialogOpen] = useState(true);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  
  // Instead of auto-setting the script, we'll pass an empty string initially
  // and only use the AI response when user clicks the "Use Last AI" button
  const getInitialScript = () => {
    if (scriptGenerated) {
      return "";
    }
    return "";
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
        initialScript=""
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
