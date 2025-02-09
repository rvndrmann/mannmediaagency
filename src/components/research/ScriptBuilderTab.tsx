
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Video } from "lucide-react";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScriptEditor } from "@/components/video/ScriptEditor";
import { StyleSelector } from "@/components/video/StyleSelector";
import { MusicUploader } from "@/components/video/MusicUploader";
import { useVideoDialog } from "@/hooks/use-video-dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  
  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { isVideoDialogOpen, setIsVideoDialogOpen, handleCreateVideo } = useVideoDialog(script);
  const showCreateVideoButton = readyToGo;
  const availableVideos = Math.floor((userCredits?.credits_remaining || 0) / 20);

  const handleMusicUpload = (musicUrl: string) => {
    setBackgroundMusic(musicUrl);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Script Builder</h3>
        </div>

        <div className="space-y-4">
          <ScriptEditor
            script={script}
            setScript={setScript}
            messages={messages}
          />

          <div className="space-y-4 mt-4">
            <StyleSelector style={style} setStyle={setStyle} />
            <MusicUploader onUpload={handleMusicUpload} />

            <div className="flex items-center justify-between">
              <Label htmlFor="readyToGo" className="text-lg text-purple-700">
                Ready to Go
              </Label>
              <Switch
                id="readyToGo"
                checked={readyToGo}
                onCheckedChange={setReadyToGo}
              />
            </div>

            {showCreateVideoButton && (
              <Button 
                variant="secondary" 
                onClick={handleCreateVideo}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Video className="h-4 w-4 mr-2" />
                Create Video
              </Button>
            )}
          </div>
        </div>
      </Card>

      <CreateVideoDialog
        isOpen={isVideoDialogOpen}
        onClose={() => setIsVideoDialogOpen(false)}
        availableVideos={availableVideos}
        creditsRemaining={userCredits?.credits_remaining || 0}
        initialScript={script}
        initialStyle={style}
        initialReadyToGo={readyToGo}
        initialBackgroundMusic={backgroundMusic}
      />
    </div>
  );
};

