
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image as ImageIcon, Mic, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [activeTab, setActiveTab] = useState("script");
  
  const hasContent = !!(script || description || imagePrompt || voiceOverText);
  
  if (!hasContent) {
    return null;
  }
  
  const handleEdit = (type: string) => {
    if (!onEditClick) return;
    
    let content = "";
    switch (type) {
      case "script":
        content = script || "";
        break;
      case "description":
        content = description || "";
        break;
      case "imagePrompt":
        content = imagePrompt || "";
        break;
      case "voiceOverText":
        content = voiceOverText || "";
        break;
    }
    
    onEditClick(type, content, sceneId);
  };
  
  return (
    <Card className="p-3 bg-gray-800/50 border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-white/90">{title}</h3>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 h-8 mb-2">
          {script && (
            <TabsTrigger value="script" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Script
            </TabsTrigger>
          )}
          {description && (
            <TabsTrigger value="description" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Description
            </TabsTrigger>
          )}
          {imagePrompt && (
            <TabsTrigger value="imagePrompt" className="text-xs">
              <ImageIcon className="h-3 w-3 mr-1" />
              Image Prompt
            </TabsTrigger>
          )}
          {voiceOverText && (
            <TabsTrigger value="voiceOverText" className="text-xs">
              <Mic className="h-3 w-3 mr-1" />
              Voice Over
            </TabsTrigger>
          )}
        </TabsList>
        
        {script && (
          <TabsContent value="script" className="relative">
            <div className="max-h-40 overflow-y-auto text-sm bg-gray-900/50 p-2 rounded">
              <Markdown>{script}</Markdown>
            </div>
            {onEditClick && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-0 right-0 h-6 w-6 p-0"
                onClick={() => handleEdit("script")}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </TabsContent>
        )}
        
        {description && (
          <TabsContent value="description" className="relative">
            <div className="max-h-40 overflow-y-auto text-sm bg-gray-900/50 p-2 rounded">
              <Markdown>{description}</Markdown>
            </div>
            {onEditClick && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-0 right-0 h-6 w-6 p-0"
                onClick={() => handleEdit("description")}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </TabsContent>
        )}
        
        {imagePrompt && (
          <TabsContent value="imagePrompt" className="relative">
            <div className="max-h-40 overflow-y-auto text-sm bg-gray-900/50 p-2 rounded">
              <Markdown>{imagePrompt}</Markdown>
            </div>
            {onEditClick && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-0 right-0 h-6 w-6 p-0"
                onClick={() => handleEdit("imagePrompt")}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </TabsContent>
        )}
        
        {voiceOverText && (
          <TabsContent value="voiceOverText" className="relative">
            <div className="max-h-40 overflow-y-auto text-sm bg-gray-900/50 p-2 rounded">
              <Markdown>{voiceOverText}</Markdown>
            </div>
            {onEditClick && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-0 right-0 h-6 w-6 p-0"
                onClick={() => handleEdit("voiceOverText")}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
