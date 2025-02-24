
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductShotV1Props {
  isMobile: boolean;
  prompt: string;
  previewUrl: string | null;
  imageSize: string;
  inferenceSteps: number;
  guidanceScale: number;
  outputFormat: string;
  productImages: any[];
  imagesLoading: boolean;
  creditsRemaining: number;
  onPromptChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onImageSizeChange: (value: string) => void;
  onInferenceStepsChange: (value: number) => void;
  onGuidanceScaleChange: (value: number) => void;
  onOutputFormatChange: (value: string) => void;
  onGenerate: () => void;
  onDownload: (url: string) => void;
}

interface FeaturePanelProps {
  messages: any[];
  productShotV2: {
    onSubmit: (data: any) => void;
    isGenerating: boolean;
    isSubmitting: boolean;
    availableCredits: number;
    generatedImages: any[];
  };
  productShotV1: ProductShotV1Props;
}

export function FeaturePanel({ messages, productShotV2, productShotV1 }: FeaturePanelProps) {
  const { toast } = useToast();

  const allProductImages = [
    ...(productShotV1.productImages || []).map(img => ({
      id: img.id,
      url: img.result_url || img.url,
      prompt: img.prompt,
      source: 'v1'
    })),
    ...(productShotV2.generatedImages || []).map(img => ({
      id: img.id,
      url: img.url,
      prompt: img.prompt,
      source: 'v2'
    }))
  ];

  const handleSelectFromHistory = (jobId: string, imageUrl: string) => {
    console.log('Selected image:', { jobId, imageUrl });
  };

  const getLastAIResponse = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");

    if (!lastAssistantMessage) {
      toast({
        title: "No AI Response Found",
        description: "There are no AI responses in the chat history.",
        variant: "destructive",
      });
      return null;
    }

    return lastAssistantMessage.content;
  };

  const useLastAIResponse = (setPromptFn: (value: string) => void) => {
    const lastResponse = getLastAIResponse();
    if (lastResponse) {
      setPromptFn(lastResponse);
      toast({
        title: "Prompt Updated",
        description: "The last AI response has been copied to the prompt.",
      });
    }
  };

  return (
    <Card className="bg-[#1A1F2C] border-gray-800 shadow-lg overflow-hidden">
      <Tabs defaultValue="product-shot-v1" className="h-[calc(100vh-8rem)]">
        <TabsList className="w-full bg-[#222222] border-b border-gray-800 px-4 py-2">
          <TabsTrigger 
            value="product-shot-v1" 
            className="flex-1 text-white data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
          >
            Product Shot V1
          </TabsTrigger>
          <TabsTrigger 
            value="product-shot-v2" 
            className="flex-1 text-white data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
          >
            Product Shot V2
          </TabsTrigger>
          <TabsTrigger 
            value="image-to-video" 
            className="flex-1 text-white data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
          >
            Image to Video
          </TabsTrigger>
          <TabsTrigger 
            value="faceless-video" 
            className="flex-1 text-white data-[state=active]:bg-[#2A2A2A] data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
          >
            Faceless Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product-shot-v1" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex h-full">
            <div className="w-1/3 min-w-[320px] flex flex-col border-r border-gray-800 bg-[#1A1F2C]">
              <div className="p-4 border-b border-gray-800">
                <Button 
                  onClick={() => useLastAIResponse(productShotV1.onPromptChange)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Use Last AI Response
                </Button>
              </div>
              <div className="flex-1">
                <InputPanel
                  isMobile={productShotV1.isMobile}
                  prompt={productShotV1.prompt}
                  onPromptChange={productShotV1.onPromptChange}
                  previewUrl={productShotV1.previewUrl}
                  onFileSelect={productShotV1.onFileSelect}
                  onClearFile={productShotV1.onClearFile}
                  imageSize={productShotV1.imageSize}
                  onImageSizeChange={productShotV1.onImageSizeChange}
                  inferenceSteps={productShotV1.inferenceSteps}
                  onInferenceStepsChange={productShotV1.onInferenceStepsChange}
                  guidanceScale={productShotV1.guidanceScale}
                  onGuidanceScaleChange={productShotV1.onGuidanceScaleChange}
                  outputFormat={productShotV1.outputFormat}
                  onOutputFormatChange={productShotV1.onOutputFormatChange}
                  onGenerate={productShotV1.onGenerate}
                  isGenerating={false}
                  creditsRemaining={productShotV1.creditsRemaining}
                />
              </div>
            </div>
            <div className="flex-1 bg-[#1A1F2C]">
              <GalleryPanel 
                isMobile={productShotV1.isMobile}
                images={productShotV1.productImages}
                isLoading={productShotV1.imagesLoading}
                onDownload={productShotV1.onDownload}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="product-shot-v2" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
              <Button 
                onClick={() => useLastAIResponse((value) => productShotV2.onSubmit({ prompt: value }))}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Use Last AI Response
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <ProductShotForm 
                    onSubmit={productShotV2.onSubmit}
                    isGenerating={productShotV2.isGenerating}
                    isSubmitting={productShotV2.isSubmitting}
                    availableCredits={productShotV2.availableCredits}
                  />
                </div>
                <div className="space-y-6">
                  {productShotV2.generatedImages.length > 0 && (
                    <GeneratedImagesPanel 
                      images={productShotV2.generatedImages}
                      isGenerating={productShotV2.isGenerating}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="image-to-video" className="h-[calc(100%-3rem)] overflow-hidden">
          <div className="flex h-full">
            <div className="w-1/3 min-w-[320px] flex flex-col border-r border-gray-800 bg-[#1A1F2C]">
              <div className="p-4 border-b border-gray-800">
                <Button 
                  onClick={() => useLastAIResponse(productShotV1.onPromptChange)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Use Last AI Response
                </Button>
              </div>
              <div className="flex-1">
                <ImageToVideoInputPanel
                  isMobile={productShotV1.isMobile}
                  prompt={productShotV1.prompt}
                  onPromptChange={productShotV1.onPromptChange}
                  previewUrl={productShotV1.previewUrl}
                  onFileSelect={productShotV1.onFileSelect}
                  onClearFile={productShotV1.onClearFile}
                  onSelectFromHistory={handleSelectFromHistory}
                  onGenerate={productShotV1.onGenerate}
                  isGenerating={false}
                  creditsRemaining={productShotV1.creditsRemaining}
                  aspectRatio="16:9"
                  onAspectRatioChange={() => {}}
                />
              </div>
            </div>
            <div className="flex-1 bg-[#1A1F2C]">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">
                    Select from Generated Product Shots
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {allProductImages.map((image) => (
                      <div 
                        key={image.id} 
                        className="group relative overflow-hidden bg-[#2A2A2A] rounded-lg border border-gray-800 transition-all hover:border-purple-500"
                      >
                        <img 
                          src={image.url} 
                          alt={image.prompt} 
                          className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                          onClick={() => handleSelectFromHistory(image.id, image.url)}
                        />
                        <div className="absolute inset-0 flex flex-col justify-between p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex justify-end">
                            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">
                              {image.source === 'v1' ? 'V1' : 'V2'}
                            </span>
                          </div>
                          <div className="bg-black/75 p-2 rounded">
                            <p className="text-white text-sm line-clamp-2">{image.prompt}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faceless-video" className="h-[calc(100%-3rem)] overflow-hidden">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
