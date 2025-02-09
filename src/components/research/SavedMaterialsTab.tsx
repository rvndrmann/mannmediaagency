
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Link, Image as ImageIcon, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

    setMaterials(data);
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
            <div className="flex items-center gap-2">
              {getIcon(material.content_type)}
              <div>
                <h4 className="font-semibold">{material.content.substring(0, 50)}...</h4>
                <p className="text-sm text-gray-500">{material.summary}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Create Video
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">Research</Badge>
            <Badge variant="outline">{material.content_type}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
};
