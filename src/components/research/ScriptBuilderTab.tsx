
import { useState } from "react";
import { Video, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScriptEditor } from "@/components/video/ScriptEditor";
import { StyleSelector } from "@/components/video/StyleSelector";
import { MusicUploader } from "@/components/video/MusicUploader";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoryCreation } from "@/hooks/use-story-creation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ScriptBuilderTabProps {
  messages: Message[];
}

export const ScriptBuilderTab = ({ messages }: ScriptBuilderTabProps) => {
  const [script, setScript] = useState("");
  const [style, setStyle] = useState<string>("");
  const [readyToGo, setReadyToGo] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { isCreating, createStory } = useStoryCreation();
  const hasEnoughCredits = (userCredits?.credits_remaining || 0) >= 10;

  const handleMusicUpload = (musicUrl: string) => {
    setBackgroundMusic(musicUrl);
  };

  const handleRemoveMusic = () => {
    setBackgroundMusic(null);
  };

  const handleCreateVideo = async () => {
    if (!hasEnoughCredits) {
      navigate("/plans");
      return;
    }

    const success = await createStory({
      script,
      style,
      readyToGo,
      backgroundMusic
    });
    
    if (success) {
      setScript("");
      setStyle("");
      setReadyToGo(false);
      setBackgroundMusic(null);
    }
  };

  if (!hasEnoughCredits) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 space-y-6">
        <Alert variant="destructive" className="w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient Credits</AlertTitle>
          <AlertDescription>
            You need at least 10 credits to create a video. Current balance: {userCredits?.credits_remaining || 0} credits.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate("/plans")}
          className="w-full bg-[#9b87f5] hover:bg-[#7E69AB] text-white h-12 rounded-lg"
        >
          Purchase Credits
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 pb-32">
        <div className="p-6 space-y-6">
          <ScriptEditor
            script={script}
            setScript={setScript}
            messages={messages}
          />

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-lg font-semibold text-white/90">Style</Label>
              <StyleSelector style={style} setStyle={setStyle} />
            </div>

            <div className="space-y-2">
              <Label className="text-lg font-semibold text-white/90">Background Music</Label>
              <MusicUploader onUpload={handleMusicUpload} />
              {backgroundMusic && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveMusic}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                >
                  Remove Music
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="readyToGo" className="text-lg font-semibold text-white/90">
                Ready to Go
              </Label>
              <Switch
                id="readyToGo"
                checked={readyToGo}
                onCheckedChange={setReadyToGo}
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="fixed md:sticky bottom-[6rem] md:bottom-0 left-0 right-0 p-4 bg-[#1A1F2C]/95 backdrop-blur-xl border-t border-gray-800 z-50">
        <Button 
          onClick={handleCreateVideo}
          disabled={isCreating}
          className="w-full bg-[#9b87f5] hover:bg-[#7E69AB] text-white h-12 rounded-lg"
        >
          <Video className="h-5 w-5 mr-2" />
          {isCreating ? "Creating Video..." : "Create Video"}
        </Button>
      </div>
    </div>
  );
};
