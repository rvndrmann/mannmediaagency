
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScriptEditor } from "@/components/video/ScriptEditor";
import { StyleSelector } from "@/components/video/StyleSelector";
import { MusicUploader } from "@/components/video/MusicUploader";
import { useVideoDialog } from "@/hooks/use-video-dialog";

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
  const { isVideoDialogOpen, setIsVideoDialogOpen, handleCreateVideo } = useVideoDialog(script);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Script Builder</h3>
          <Button variant="secondary" onClick={handleCreateVideo}>
            <Video className="h-4 w-4 mr-2" />
            Create Video
          </Button>
        </div>

        <div className="space-y-4">
          <ScriptEditor
            script={script}
            setScript={setScript}
            messages={messages}
          />

          <div className="space-y-4 mt-4">
            <StyleSelector style={style} setStyle={setStyle} />
            <MusicUploader />

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
      </Card>

      <CreateVideoDialog
        isOpen={isVideoDialogOpen}
        onClose={() => setIsVideoDialogOpen(false)}
        availableVideos={5}
        creditsRemaining={100}
        initialScript={script}
      />
    </div>
  );
};
