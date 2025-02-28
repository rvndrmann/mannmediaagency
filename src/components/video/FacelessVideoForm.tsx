
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScriptInputSection } from "./dialog/ScriptInputSection";
import { StyleSelectorSection } from "./dialog/StyleSelectorSection";
import { MusicUploaderSection } from "./dialog/MusicUploaderSection";
import { ProductPhotoSection } from "./dialog/ProductPhotoSection";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { useVideoCreation } from "@/hooks/use-video-creation";
import { Message } from "@/types/message";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface FacelessVideoFormProps {
  messages: Message[];
  creditsRemaining: number;
}

export function FacelessVideoForm({ messages, creditsRemaining }: FacelessVideoFormProps) {
  const [source, setSource] = useState("");
  const [readyToGo, setReadyToGo] = useState(false);
  const [style, setStyle] = useState("");
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string | null>(null);
  const [productPhotoUrl, setProductPhotoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    uploadProgress: musicUploadProgress,
    uploadedFileName: musicFileName,
    handleFileUpload: handleMusicUpload
  } = useSupabaseUpload(null);

  const {
    uploadProgress: photoUploadProgress,
    uploadedFileName: photoFileName,
    previewUrl: photoPreviewUrl,
    handleFileUpload: handlePhotoUpload
  } = useSupabaseUpload(null);

  const { isSubmitting, createVideo } = useVideoCreation({
    onSuccess: () => {
      setSource("");
      setStyle("");
      setBackgroundMusicUrl(null);
      setProductPhotoUrl(null);
      setReadyToGo(false);
      toast({
        title: "Video Created",
        description: "Your product video has been created and is being processed. You can view it in your dashboard once ready.",
      });
    }
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await handlePhotoUpload(file, 'product-photos', 'image');
        if (url) {
          console.log("Product photo uploaded successfully:", url);
          setProductPhotoUrl(url);
        }
      } catch (error) {
        console.error("Error uploading product photo:", error);
        toast({
          title: "Upload Error",
          description: "Failed to upload product photo. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleMusicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await handleMusicUpload(file, 'background-music', 'audio');
        if (url) {
          console.log("Background music uploaded successfully:", url);
          setBackgroundMusicUrl(url);
        }
      } catch (error) {
        console.error("Error uploading background music:", error);
        toast({
          title: "Upload Error",
          description: "Failed to upload background music. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!source.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a script or idea for your video.",
        variant: "destructive",
      });
      return;
    }

    if (!style) {
      toast({
        title: "Missing Information",
        description: "Please select a style for your video.",
        variant: "destructive",
      });
      return;
    }

    await createVideo({
      source,
      readyToGo,
      backgroundMusicUrl,
      productPhotoUrl,
      style
    });
  };

  const hasEnoughCredits = creditsRemaining >= 20;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 pb-32 lg:pb-6">
      <div className="space-y-6 flex flex-col">
        <ScrollArea className="flex-1">
          <Card className="p-4 bg-gray-900 border-gray-800">
            <div className="space-y-6">
              <ScriptInputSection
                source={source}
                onSourceChange={setSource}
              />

              <ProductPhotoSection
                uploadProgress={photoUploadProgress}
                uploadedFileName={photoFileName}
                previewUrl={photoPreviewUrl}
                onFileChange={handlePhotoChange}
              />

              <StyleSelectorSection
                style={style}
                onStyleChange={setStyle}
              />

              <MusicUploaderSection
                uploadProgress={musicUploadProgress}
                uploadedFileName={musicFileName}
                onFileChange={handleMusicChange}
              />

              <div className="flex items-center justify-between">
                <Label htmlFor="readyToGo" className="text-xl text-purple-600">
                  Ready to Go
                </Label>
                <Switch
                  id="readyToGo"
                  checked={readyToGo}
                  onCheckedChange={setReadyToGo}
                />
              </div>
            </div>
          </Card>
        </ScrollArea>
      </div>

      <div className="space-y-6">
        {/* Preview section - can be expanded based on requirements */}
        <Card className="p-4 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">Generated Videos</h2>
          <div className="text-gray-400 text-center py-8">
            Your generated videos will appear here
          </div>
        </Card>
      </div>
      
      {/* Fixed Generate button for better visibility */}
      <div className="fixed md:sticky bottom-[6rem] md:bottom-0 left-0 right-0 p-4 bg-[#1A1F2C]/95 backdrop-blur-xl border-t border-gray-800 z-50 lg:col-span-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !hasEnoughCredits}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 md:py-6 text-base md:text-lg font-medium"
        >
          {isSubmitting ? "Creating..." : `Generate Video (${creditsRemaining} credits available)`}
        </Button>
        {!hasEnoughCredits && (
          <p className="text-red-500 text-sm mt-2 text-center">
            You need at least 20 credits to create a video
          </p>
        )}
      </div>
    </div>
  );
};
