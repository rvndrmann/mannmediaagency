
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronRight } from "lucide-react";

interface ProductAdShotsProps {
  projectId: string;
  onComplete: () => void;
}

export const ProductAdShots = ({ projectId, onComplete }: ProductAdShotsProps) => {
  const [generatingShot, setGeneratingShot] = useState<number | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
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

  const { data: shots, isLoading: shotsLoading } = useQuery({
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
    mutationFn: async (sceneIndex: number) => {
      const scene = project.script.scenes[sceneIndex];
      
      const response = await supabase.functions.invoke("generate-product-shot", {
        body: {
          projectId,
          originalImageUrl: project.product_image_url,
          sceneDescription: scene.description,
          shotType: scene.shot_type,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { data: shot, error: shotError } = await supabase
        .from("product_ad_shots")
        .insert({
          project_id: projectId,
          image_url: response.data.imageUrl,
          shot_type: scene.shot_type,
          scene_description: scene.description,
          order_index: sceneIndex,
          status: 'completed'
        })
        .select()
        .single();

      if (shotError) {
        throw shotError;
      }

      return shot;
    },
    onSuccess: () => {
      setGeneratingShot(null);
    },
    onError: (error) => {
      setGeneratingShot(null);
      toast.error(error instanceof Error ? error.message : "Failed to generate shot");
    },
  });

  const handleGenerateShot = async (sceneIndex: number) => {
    setGeneratingShot(sceneIndex);
    await generateShotMutation.mutateAsync(sceneIndex);
  };

  const handleContinue = async () => {
    const { error } = await supabase
      .from("product_ad_projects")
      .update({ status: 'shots_generated' })
      .eq("id", projectId);

    if (error) {
      toast.error("Failed to update project status");
      return;
    }

    onComplete();
  };

  if (projectLoading || shotsLoading) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      </Card>
    );
  }

  const scenes = project.script.scenes || [];
  const allShotsGenerated = shots?.length === scenes.length;

  return (
    <Card className="p-6 bg-gray-900 border-gray-800">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Generate Scene Shots</h2>
          <p className="text-gray-400 mb-6">
            Generate enhanced product shots for each scene in your ad.
          </p>
        </div>

        <div className="space-y-4">
          {scenes.map((scene, index) => {
            const shot = shots?.find(s => s.order_index === index);
            
            return (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-2">Scene {index + 1}</h3>
                    <p className="text-gray-400 text-sm mb-2">{scene.description}</p>
                    <p className="text-purple-400 text-sm">Shot: {scene.shot_type}</p>
                  </div>
                  
                  {shot ? (
                    <div className="ml-4">
                      <img 
                        src={shot.image_url} 
                        alt={`Scene ${index + 1}`}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleGenerateShot(index)}
                      disabled={generatingShot !== null}
                      className="ml-4 bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingShot === index ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Shot"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleContinue}
          disabled={!allShotsGenerated}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          Continue to Video Generation
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
