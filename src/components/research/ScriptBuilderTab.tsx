
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
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <Card className="flex-1 flex flex-col" onClick={handleCardClick}>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <ScriptEditor
              script={script}
              setScript={setScript}
              messages={messages}
            />

            <div className="space-y-4">
              <StyleSelector style={style} setStyle={setStyle} />
              <div className="mb-6">
                <MusicUploader onUpload={handleMusicUpload} />
              </div>

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
            </div>
          </div>
        </ScrollArea>

        {/* Fixed button container at the bottom */}
        <div className="p-4 border-t bg-white">
          <Button 
            variant="secondary" 
            onClick={handleCreateVideo}
            disabled={isCreating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Video className="h-4 w-4 mr-2" />
            {isCreating ? "Creating Video..." : "Create Video"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

