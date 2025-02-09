
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Video } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScriptEditor } from "@/components/video/ScriptEditor";
import { StyleSelector } from "@/components/video/StyleSelector";
import { MusicUploader } from "@/components/video/MusicUploader";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoryCreation } from "@/hooks/use-story-creation";

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

  const { isCreating, createStory } = useStoryCreation();
  const showCreateVideoButton = readyToGo;
  const availableVideos = Math.floor((userCredits?.credits_remaining || 0) / 20);

  const handleMusicUpload = (musicUrl: string) => {
    setBackgroundMusic(musicUrl);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCreateVideo = async () => {
    const success = await createStory(script, style, readyToGo, backgroundMusic);
    if (success) {
      // Reset form
      setScript("");
      setStyle("");
      setReadyToGo(false);
      setBackgroundMusic(null);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <Card className="p-4 flex-1" onClick={handleCardClick}>
        <div className="flex flex-col h-full">
          <div className="space-y-4 flex-1">
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
                  disabled={isCreating}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Video className="h-4 w-4 mr-2" />
                  {isCreating ? "Creating Video..." : "Create Video"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
