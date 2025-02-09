
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Link, Image as ImageIcon, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResearchMaterial {
  id: string;
  content_type: 'text' | 'url' | 'image';
  content: string;
  summary: string;
  created_at: string;
}

export const SavedMaterialsTab = () => {
  const [materials, setMaterials] = useState<ResearchMaterial[]>([]);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from('research_materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
      return;
    }

    // Validate and transform the data to match our interface
    const validMaterials = data
      .filter(item => ['text', 'url', 'image'].includes(item.content_type))
      .map(item => ({
        id: item.id,
        content_type: item.content_type as 'text' | 'url' | 'image',
        content: item.content,
        summary: item.summary || '',
        created_at: item.created_at
      }));

    setMaterials(validMaterials);
  };

  const getIcon = (type: 'text' | 'url' | 'image') => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'url':
        return <Link className="h-4 w-4" />;
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {materials.map((material) => (
        <Card key={material.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              {getIcon(material.content_type)}
              <div className="flex-1">
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <div className="whitespace-pre-wrap">{material.content}</div>
                </ScrollArea>
                <p className="text-sm text-gray-500 mt-2">{material.summary}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="ml-4">
              <Video className="h-4 w-4 mr-2" />
              Create Video
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">Research</Badge>
            <Badge variant="outline">{material.content_type}</Badge>
            <Badge variant="outline">
              {new Date(material.created_at).toLocaleDateString()}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
};
