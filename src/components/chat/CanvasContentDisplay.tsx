
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, FileText, Image, Video, Mic } from "lucide-react";

interface CanvasContentDisplayProps {
  title: string;
  sceneId: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  voiceOverText?: string;
  onEditClick?: (type: string, content: string, sceneId: string) => void;
}

export function CanvasContentDisplay({
  title,
  sceneId,
  script,
  description,
  imagePrompt,
  voiceOverText,
  onEditClick
}: CanvasContentDisplayProps) {
  return (
    <Card className="overflow-hidden border-muted">
      <CardHeader className="p-3 pb-1 bg-muted/50">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-sm">
        {description && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <span>Description</span>
              </div>
              {onEditClick && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => onEditClick('description', description, sceneId)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}
        
        {script && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <span>Script</span>
              </div>
              {onEditClick && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => onEditClick('script', script, sceneId)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {script}
            </p>
          </div>
        )}
        
        {imagePrompt && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center">
                <Image className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <span>Image Prompt</span>
              </div>
              {onEditClick && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => onEditClick('imagePrompt', imagePrompt, sceneId)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {imagePrompt}
            </p>
          </div>
        )}
        
        {voiceOverText && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center">
                <Mic className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <span>Voice Over</span>
              </div>
              {onEditClick && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => onEditClick('voiceOverText', voiceOverText, sceneId)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {voiceOverText}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
