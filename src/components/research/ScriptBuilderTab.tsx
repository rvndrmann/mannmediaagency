
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Video, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ScriptBuilderTabProps {
  messages: Message[];
}

interface StoryType {
  id: number;
  story_type: string | null;
}

export const ScriptBuilderTab = ({ messages }: ScriptBuilderTabProps) => {
  const [script, setScript] = useState("");
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [style, setStyle] = useState<string>("");
  const [readyToGo, setReadyToGo] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: storyTypes } = useQuery({
    queryKey: ["storyTypes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_type")
        .select("id, story_type");
      
      if (error) {
        throw error;
      }
      
      return data as StoryType[];
    },
  });

  const handleGenerateScript = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === "assistant");

    if (lastAssistantMessage) {
      setScript(lastAssistantMessage.content);
      toast({
        title: "Script Generated",
        description: "The last AI response has been used as your script.",
      });
    } else {
      toast({
        title: "No Script Found",
        description: "No AI responses found to generate script from.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Error",
          description: "Please upload an audio file",
          variant: "destructive",
        });
        return;
      }
      setBackgroundMusic(file);
      setUploadProgress(0);
      setUploadedFileName(null);

      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: file.type });
          
          const { error: uploadError } = await supabase.storage
            .from('background-music')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          setUploadProgress(100);
          setUploadedFileName(file.name);
        };

        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            setUploadProgress(percent);
          }
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Error",
          description: "Failed to upload background music",
          variant: "destructive",
        });
        setUploadProgress(0);
        setUploadedFileName(null);
      }
    }
  };

  const handleCreateVideo = () => {
    if (!script.trim()) {
      toast({
        title: "Error",
        description: "Please generate or write a script first",
        variant: "destructive",
      });
      return;
    }
    setIsVideoDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Script Builder</h3>
          <div className="flex gap-2">
            <Button onClick={handleGenerateScript}>
              <PenTool className="h-4 w-4 mr-2" />
              Use Last AI Response
            </Button>
            <Button variant="secondary" onClick={handleCreateVideo}>
              <Video className="h-4 w-4 mr-2" />
              Create Video
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Start writing your script here..."
            className="min-h-[200px]"
          />

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="style" className="text-lg text-purple-700">
                Style
              </Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {storyTypes?.map((type) => (
                    <SelectItem 
                      key={type.id} 
                      value={type.story_type || ""}
                    >
                      {type.story_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundMusic" className="text-lg text-purple-700">
                Background Music
              </Label>
              <div className="space-y-2">
                <Input
                  id="backgroundMusic"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
                {uploadProgress > 0 && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-purple-600">
                      {uploadProgress === 100 ? 'Upload complete!' : `Uploading: ${Math.round(uploadProgress)}%`}
                    </p>
                  </div>
                )}
                {uploadedFileName && uploadProgress === 100 && (
                  <div className="flex items-center gap-2 text-green-600 mt-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Uploaded: {uploadedFileName}</span>
                  </div>
                )}
              </div>
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
