
// Import needed modules and components
import { Message } from "@/types/message";
import { GeneratedImage } from "@/types/product-shoot";
import { Tabs } from "@radix-ui/react-tabs";
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
        <div className="product-shot-v1-panel h-full">
          {/* Render product shot v1 panel directly using props */}
          <div className="space-y-4 p-4">
            <textarea
              className="w-full p-2 bg-gray-800 text-white rounded-md"
              placeholder="Enter product description..."
              value={productShotV1.prompt || ''}
              onChange={(e) => productShotV1.onPromptChange?.(e.target.value)}
            />
            
            {productShotV1.previewUrl && (
              <div className="aspect-square relative rounded-md overflow-hidden">
                <img 
                  src={productShotV1.previewUrl} 
                  alt="Product preview" 
                  className="object-cover w-full h-full"
                />
                <button 
                  onClick={productShotV1.onClearFile}
                  className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full"
                >
                  ×
                </button>
              </div>
            )}
            
            <div className="flex justify-between">
              <label className="text-white">
                Image Size:
                <select 
                  value={productShotV1.imageSize} 
                  onChange={(e) => productShotV1.onImageSizeChange?.(e.target.value)}
                  className="ml-2 bg-gray-800 rounded-md"
                >
                  <option value="512x512">512×512</option>
                  <option value="768x768">768×768</option>
                </select>
              </label>
              
              <button
                onClick={productShotV1.onGenerate}
                disabled={productShotV1.isGenerating}
                className="bg-purple-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {productShotV1.isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTool === 'product-shot-v2' && (
        <div className="product-shot-v2-panel h-full">
          {/* Import and use ProductShotForm here */}
          {(() => {
            const ProductShotForm = require('@/components/product-shoot-v2/ProductShotForm').ProductShotForm;
            return (
              <ProductShotForm
                onSubmit={productShotV2.onSubmit}
                isGenerating={productShotV2.isGenerating}
                isSubmitting={productShotV2.isSubmitting}
                availableCredits={productShotV2.availableCredits}
                messages={messages}
              />
            );
          })()}
        </div>
      )}

      {activeTool === 'image-to-video' && (
        <div className="image-to-video-panel h-full">
          {/* Render image to video panel directly using props */}
          <div className="space-y-4 p-4">
            {imageToVideo.previewUrl && (
              <div className="aspect-square relative rounded-md overflow-hidden">
                <img 
                  src={imageToVideo.previewUrl} 
                  alt="Image preview" 
                  className="object-cover w-full h-full"
                />
                <button 
                  onClick={imageToVideo.onClearFile}
                  className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full"
                >
                  ×
                </button>
              </div>
            )}
            
            <textarea
              className="w-full p-2 bg-gray-800 text-white rounded-md"
              placeholder="Enter video description..."
              value={imageToVideo.prompt || ''}
              onChange={(e) => imageToVideo.onPromptChange?.(e.target.value)}
            />
            
            <div className="flex justify-between">
              <label className="text-white">
                Aspect Ratio:
                <select 
                  value={imageToVideo.aspectRatio} 
                  onChange={(e) => imageToVideo.onAspectRatioChange?.(e.target.value)}
                  className="ml-2 bg-gray-800 rounded-md"
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                </select>
              </label>
              
              <button
                onClick={() => imageToVideo.onGenerate(imageToVideo.prompt, imageToVideo.aspectRatio)}
                disabled={imageToVideo.isGenerating}
                className="bg-purple-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {imageToVideo.isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTool === 'faceless-video' && (
        <div className="faceless-video-form p-4 h-full">
          {(() => {
            const { CreateVideoDialog } = require('@/components/video/CreateVideoDialog');
            return (
              <CreateVideoDialog
                isOpen={true}
                onClose={() => {}}
                availableVideos={0}
                creditsRemaining={creditsRemaining}
                embeddedMode={true}
                messages={messages}
                onMobileSubmit={onVideoSubmitRegistration}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
