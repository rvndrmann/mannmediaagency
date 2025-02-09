
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ResearchMaterial } from "@/types/chat";

export const useResearchMaterials = () => {
  const [researchMaterials, setResearchMaterials] = useState<ResearchMaterial[]>([]);
  const [processedMaterialIds, setProcessedMaterialIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchResearchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('research_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validMaterials = data
        .filter(item => ['text', 'url', 'image'].includes(item.content_type))
        .map(item => ({
          id: item.id,
          content_type: item.content_type as 'text' | 'url' | 'image',
          content: item.content,
          summary: item.summary || '',
          created_at: item.created_at
        }));

      setResearchMaterials(validMaterials);
    } catch (error) {
      console.error('Error fetching research materials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch research materials",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchResearchMaterials();
  }, []);

  const getNewMaterialsContext = (input: string) => {
    const newMaterials = researchMaterials.filter(material => !processedMaterialIds.has(material.id));

    if (newMaterials.length === 0) {
      return input;
    }

    const researchContext = newMaterials
      .map(material => `${material.content_type.toUpperCase()}: ${material.content}\nSummary: ${material.summary}`)
      .join('\n\n');

    setProcessedMaterialIds(prev => {
      const newSet = new Set(prev);
      newMaterials.forEach(material => newSet.add(material.id));
      return newSet;
    });

    return `New research materials:\n${researchContext}\n\nUser question: ${input}`;
  };

  return {
    researchMaterials,
    getNewMaterialsContext,
  };
};
