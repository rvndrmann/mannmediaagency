
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CanvasScene } from "@/types/canvas";
import { Edit, Copy, Save, Wand2, Loader2 } from "lucide-react";

interface SceneCardProps {
  title: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  type: "text" | "image" | "video";
  scene: CanvasScene;
  onUpdate: (value: string) => Promise<void>;
}

export function SceneCard({
  title,
  content,
  imageUrl,
  videoUrl,
  type,
  scene,
  onUpdate,
}: SceneCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content || "");
  const [isGenerating, setIsGenerating] = useState(false);

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

    return <p className="text-muted-foreground italic">No content yet</p>;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
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
