
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Edit } from "lucide-react";
import { CanvasScene } from "@/types/canvas";
import { Markdown } from "@/components/ui/markdown";

interface CanvasContentDisplayProps {
  scene?: CanvasScene;
  title: string;
  sceneId: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  voiceOverText?: string;
  onEditClick?: (type: string, content: string, sceneId: string) => void;
}

export function CanvasContentDisplay({
  scene,
  title,
  sceneId,
  script,
  description,
  imagePrompt,
  voiceOverText,
  onEditClick
}: CanvasContentDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>("script");
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  
  // Use either the passed props or get from scene object
  const scriptContent = script || scene?.script || "";
  const descriptionContent = description || scene?.description || "";
  const imagePromptContent = imagePrompt || scene?.imagePrompt || "";
  const voiceOverContent = voiceOverText || scene?.voiceOverText || "";
  
  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopied({ ...copied, [type]: true });
    setTimeout(() => {
      setCopied({ ...copied, [type]: false });
    }, 2000);
  };
  
  const handleEdit = (type: string, content: string) => {
    if (onEditClick) {
      onEditClick(type, content, sceneId);
    }
  };
  
  const hasContent = scriptContent || descriptionContent || imagePromptContent || voiceOverContent;
  
  if (!hasContent) {
    return (
      <Card className="w-full mb-4 bg-muted/30">
        <CardContent className="pt-6 text-center text-muted-foreground">
          No content available for this scene.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full mb-4 border-indigo-200/30">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <Badge variant="outline" className="text-xs">Scene ID: {sceneId}</Badge>
        </div>
      </CardHeader>
      
      <Tabs defaultValue="script" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full">
            {scriptContent && (
              <TabsTrigger value="script" className="flex-1">Script</TabsTrigger>
            )}
            {descriptionContent && (
              <TabsTrigger value="description" className="flex-1">Description</TabsTrigger>
            )}
            {imagePromptContent && (
              <TabsTrigger value="imagePrompt" className="flex-1">Image Prompt</TabsTrigger>
            )}
            {voiceOverContent && (
              <TabsTrigger value="voiceOver" className="flex-1">Voice Over</TabsTrigger>
            )}
          </TabsList>
        </div>
        
        {scriptContent && (
          <TabsContent value="script" className="mt-2 mx-2">
            <Card className="border-none shadow-none bg-muted/30">
              <CardContent className="p-4">
                <Markdown>{scriptContent}</Markdown>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-0 pb-2 px-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(scriptContent, "script")}
                  className="h-8"
                >
                  {copied.script ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied.script ? "Copied" : "Copy"}
                </Button>
                {onEditClick && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit("script", scriptContent)}
                    className="h-8"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        
        {descriptionContent && (
          <TabsContent value="description" className="mt-2 mx-2">
            <Card className="border-none shadow-none bg-muted/30">
              <CardContent className="p-4">
                <Markdown>{descriptionContent}</Markdown>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-0 pb-2 px-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(descriptionContent, "description")}
                  className="h-8"
                >
                  {copied.description ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied.description ? "Copied" : "Copy"}
                </Button>
                {onEditClick && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit("description", descriptionContent)}
                    className="h-8"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        
        {imagePromptContent && (
          <TabsContent value="imagePrompt" className="mt-2 mx-2">
            <Card className="border-none shadow-none bg-muted/30">
              <CardContent className="p-4">
                <Markdown>{imagePromptContent}</Markdown>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-0 pb-2 px-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(imagePromptContent, "imagePrompt")}
                  className="h-8"
                >
                  {copied.imagePrompt ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied.imagePrompt ? "Copied" : "Copy"}
                </Button>
                {onEditClick && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit("imagePrompt", imagePromptContent)}
                    className="h-8"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        
        {voiceOverContent && (
          <TabsContent value="voiceOver" className="mt-2 mx-2">
            <Card className="border-none shadow-none bg-muted/30">
              <CardContent className="p-4">
                <Markdown>{voiceOverContent}</Markdown>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-0 pb-2 px-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(voiceOverContent, "voiceOver")}
                  className="h-8"
                >
                  {copied.voiceOver ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied.voiceOver ? "Copied" : "Copy"}
                </Button>
                {onEditClick && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit("voiceOver", voiceOverContent)}
                    className="h-8"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
