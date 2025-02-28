
// Import needed modules and components
import { Message } from "@/types/message";
import { GeneratedImage } from "@/types/product-shoot";
import { Tab } from "@radix-ui/react-tabs";
import { ProductShootPanel } from "@/components/product-shot-v1/ProductShootPanel";
import { ProductShotV2Panel } from "../product-shoot-v2/ProductShotV2Panel";
import { ImageToVideoPanel } from "../image-to-video/ImageToVideoPanel";
import { CreateVideoDialog } from "../video/CreateVideoDialog";
import { useUserCredits } from "@/hooks/use-user-credits";

// Define prop interfaces as needed for each panel component

interface FeaturePanelProps {
  messages: Message[];
  productShotV1: any;
  productShotV2: {
    onSubmit: (formData: any) => Promise<void>;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: GeneratedImage[];
    messages: Message[];
  };
  imageToVideo: any;
  activeTool: string;
  onVideoSubmitRegistration?: (submitFn: () => Promise<void>) => void;
}

export function FeaturePanel({
  messages,
  productShotV1,
  productShotV2,
  imageToVideo,
  activeTool,
  onVideoSubmitRegistration
}: FeaturePanelProps) {
  const userCreditsQuery = useUserCredits();
  const creditsRemaining = userCreditsQuery.data?.credits_remaining || 0;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {activeTool === 'product-shot-v1' && (
        <ProductShootPanel {...productShotV1} />
      )}

      {activeTool === 'product-shot-v2' && (
        <ProductShotV2Panel
          onSubmit={productShotV2.onSubmit}
          isGenerating={productShotV2.isGenerating}
          isSubmitting={productShotV2.isSubmitting}
          availableCredits={productShotV2.availableCredits}
          generatedImages={productShotV2.generatedImages || []}
          messages={messages}
        />
      )}

      {activeTool === 'image-to-video' && (
        <ImageToVideoPanel {...imageToVideo} />
      )}

      {activeTool === 'faceless-video' && (
        <div className="faceless-video-form p-4 h-full">
          <CreateVideoDialog
            isOpen={true}
            onClose={() => {}}
            availableVideos={0}
            creditsRemaining={creditsRemaining}
            embeddedMode={true}
            messages={messages}
            onMobileSubmit={onVideoSubmitRegistration}
          />
        </div>
      )}
    </div>
  );
}
