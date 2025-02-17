
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProductAdShotsProps {
  projectId: string;
  onComplete: () => void;
}

interface Scene {
  description: string;
  shot_type: string;
}

interface ProjectScript {
  scenes: Scene[];
}

export const ProductAdShots = ({ projectId, onComplete }: ProductAdShotsProps) => {
  const { data: project } = useQuery({
    queryKey: ["product-ad-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ad_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: shots } = useQuery({
    queryKey: ["product-ad-shots", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ad_shots")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");

      if (error) throw error;
      return data;
    },
  });

  const generateShotMutation = useMutation({
    mutationFn: async ({ scene, index }: { scene: Scene; index: number }) => {
      const response = await supabase.functions.invoke("generate-product-shot", {
        body: {
          project_id: projectId,
          scene_description: scene.description,
          shot_type: scene.shot_type,
          order_index: index,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Shot generated successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate shot");
    },
  });

  const handleGenerateShot = async (scene: Scene, index: number) => {
    await generateShotMutation.mutateAsync({ scene, index });
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from("product_ad_projects")
        .update({ status: "shots_generated" })
        .eq("id", projectId);

      if (error) throw error;
      onComplete();
    } catch (error) {
      toast.error("Failed to update project status");
    }
  };

  if (!project?.script) return null;

  const script = project.script as unknown as ProjectScript;
  const allShotsGenerated = shots?.length === script.scenes.length;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {script.scenes.map((scene, index) => (
          <div key={index} className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-white font-medium mb-2">Scene {index + 1}</h3>
            <p className="text-gray-300 mb-4">{scene.description}</p>
            <Button
              onClick={() => handleGenerateShot(scene, index)}
              disabled={generateShotMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Generate Shot
            </Button>
          </div>
        ))}

        <Button
          onClick={handleComplete}
          disabled={!allShotsGenerated}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Complete Shot Generation
        </Button>
      </div>
    </Card>
  );
};
