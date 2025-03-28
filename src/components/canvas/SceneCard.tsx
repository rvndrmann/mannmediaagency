import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CanvasScene } from "@/types/canvas";
import { Edit, Copy, Save, Wand2, Loader2, Music, Mic, Play } from "lucide-react";

interface SceneCardProps {
  title: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  type: "text" | "image" | "video" | "audio";
  audioType?: "voiceOver" | "backgroundMusic";
  scene: CanvasScene;
  onUpdate: (value: string) => Promise<void>;
}

export function SceneCard({
  title,
  content,
  imageUrl,
  videoUrl,
  type,
  audioType,
  scene,
  onUpdate,
}: SceneCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleEdit = () => {
    setEditedContent(content || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    await onUpdate(editedContent);
    setIsEditing(false);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      // Here you would call the actual AI generation logic
    }, 2000);
  };

  const handleCopy = () => {
    if (type === "text" && content) {
      navigator.clipboard.writeText(content);
    }
  };

  const toggleAudio = () => {
    if (type === "audio") {
      const audioUrl = audioType === "voiceOver" 
        ? scene.voiceOverUrl 
        : scene.backgroundMusicUrl;
      
      if (!audioUrl) return;

      if (!audio) {
        const newAudio = new Audio(audioUrl);
        newAudio.addEventListener('ended', () => {
          setIsPlaying(false);
        });
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          audio.pause();
          audio.currentTime = 0;
          setIsPlaying(false);
        } else {
          audio.play();
          setIsPlaying(true);
        }
      }
    }
  };

  const renderContent = () => {
    if (isEditing && type === "text") {
      return (
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="min-h-[150px] resize-none"
          placeholder={`Enter ${title.toLowerCase()} here...`}
        />
      );
    }

    if (type === "text") {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <p className="text-muted-foreground italic">No content yet</p>
          )}
        </div>
      );
    }

    if (type === "image" && imageUrl) {
      return (
        <div className="relative aspect-video bg-slate-200 dark:bg-slate-800 rounded-md overflow-hidden">
          <img
            src={imageUrl}
            alt={`Scene ${scene.title} image`}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (type === "video" && videoUrl) {
      return (
        <div className="relative aspect-video bg-slate-200 dark:bg-slate-800 rounded-md overflow-hidden">
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (type === "audio") {
      const audioUrl = audioType === "voiceOver" 
        ? scene.voiceOverUrl 
        : scene.backgroundMusicUrl;
      
      if (!audioUrl) {
        return <p className="text-muted-foreground italic">No audio uploaded</p>;
      }
      
      return (
        <div className="flex flex-col items-center justify-center p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAudio}
            className="mb-2"
          >
            {isPlaying ? (
              <>Stop Playing</>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Play {audioType === "voiceOver" ? "Voice-Over" : "Music"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground truncate max-w-full">
            {new URL(audioUrl).pathname.split('/').pop()}
          </p>
        </div>
      );
    }

    return <p className="text-muted-foreground italic">No content yet</p>;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {title}
          {type === "audio" && audioType === "voiceOver" && (
            <Mic className="h-4 w-4 inline ml-2" />
          )}
          {type === "audio" && audioType === "backgroundMusic" && (
            <Music className="h-4 w-4 inline ml-2" />
          )}
        </CardTitle>
        <div className="flex gap-1">
          {type === "text" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {isEditing ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  className="h-7 w-7"
                >
                  <Save className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEdit}
                  className="h-7 w-7"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAIGenerate}
            className="h-7 w-7"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
