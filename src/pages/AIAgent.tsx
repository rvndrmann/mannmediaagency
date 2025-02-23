
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ChatPanel } from "@/components/ai-agent/ChatPanel";
import { useAIChat } from "@/hooks/use-ai-chat";
import { ProductShotForm } from "@/components/product-shoot-v2/ProductShotForm";
import { useProductShoot } from "@/hooks/use-product-shoot";
import { GeneratedImagesPanel } from "@/components/product-shoot-v2/GeneratedImagesPanel";
import { InputPanel } from "@/components/product-shoot/InputPanel";
import { GalleryPanel } from "@/components/product-shoot/GalleryPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const AIAgent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState("square_hd");
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [outputFormat, setOutputFormat] = useState("png");

  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    userCredits
  } = useAIChat();

  const { 
    isGenerating: isGeneratingV2, 
    isSubmitting: isSubmittingV2, 
    generatedImages: generatedImagesV2, 
    handleGenerate: handleGenerateV2
  } = useProductShoot();

  const { data: availableCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data?.credits_remaining || 0;
    },
  });

  const { data: productImages, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      if (!userCredits?.user_id) return [];

      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq('user_id', userCredits.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userCredits?.user_id,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleGenerateV1 = async () => {
    // Implementation will be added in the next iteration
    console.log("Generate V1 clicked");
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `product-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1F2C]">
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">AI Agent</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4 h-[calc(100vh-8rem)] flex flex-col">
            <Tabs defaultValue="chat" className="flex-1 flex flex-col">
              <TabsList className="w-full bg-[#333333] mb-4">
                <TabsTrigger 
                  value="chat" 
                  className="flex-1 text-white data-[state=active]:bg-[#444444]"
                >
                  Chat
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                <ChatPanel
                  messages={messages}
                  input={input}
                  isLoading={isLoading}
                  userCredits={userCredits}
                  onInputChange={setInput}
                  onSubmit={handleSubmit}
                />
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4 h-[calc(100vh-8rem)]">
            <Tabs defaultValue="script" className="flex-1 h-full">
              <TabsList className="w-full bg-[#333333] mb-4">
                <TabsTrigger 
                  value="script" 
                  className="flex-1 text-white data-[state=active]:bg-[#444444]"
                >
                  Video Script
                </TabsTrigger>
                <TabsTrigger 
                  value="product-shot-v2" 
                  className="flex-1 text-white data-[state=active]:bg-[#444444]"
                >
                  Product Shot V2
                </TabsTrigger>
                <TabsTrigger 
                  value="product-shot-v1" 
                  className="flex-1 text-white data-[state=active]:bg-[#444444]"
                >
                  Product Shot V1
                </TabsTrigger>
              </TabsList>

              <TabsContent value="script" className="h-full">
                <ScriptBuilderTab messages={messages} />
              </TabsContent>

              <TabsContent value="product-shot-v2" className="h-full">
                <div className="space-y-6">
                  <ProductShotForm 
                    onSubmit={handleGenerateV2}
                    isGenerating={isGeneratingV2}
                    isSubmitting={isSubmittingV2}
                    availableCredits={availableCredits}
                  />
                  {generatedImagesV2.length > 0 && (
                    <GeneratedImagesPanel 
                      images={generatedImagesV2}
                      isGenerating={isGeneratingV2}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="product-shot-v1" className="h-full">
                <div className="flex flex-col h-full">
                  <InputPanel
                    isMobile={isMobile}
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    previewUrl={previewUrl}
                    onFileSelect={handleFileSelect}
                    onClearFile={clearSelectedFile}
                    imageSize={imageSize}
                    onImageSizeChange={setImageSize}
                    inferenceSteps={inferenceSteps}
                    onInferenceStepsChange={setInferenceSteps}
                    guidanceScale={guidanceScale}
                    onGuidanceScaleChange={setGuidanceScale}
                    outputFormat={outputFormat}
                    onOutputFormatChange={setOutputFormat}
                    onGenerate={handleGenerateV1}
                    isGenerating={false}
                    creditsRemaining={availableCredits}
                  />
                  {productImages && productImages.length > 0 && (
                    <div className="mt-4 flex-1">
                      <GalleryPanel 
                        isMobile={isMobile}
                        images={productImages}
                        isLoading={imagesLoading}
                        onDownload={handleDownload}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
