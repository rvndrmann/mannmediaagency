
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Check, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductAdShotsProps {
  projectId: string | null;
  onComplete: () => void;
}

export const ProductAdShots = ({ projectId, onComplete }: ProductAdShotsProps) => {
  const queryClient = useQueryClient();
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["product-ad-project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("product_ad_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: shots } = useQuery({
    queryKey: ["product-ad-shots", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("product_ad_shots")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const generateShots = useMutation({
    mutationFn: async () => {
      if (!project?.script || !project.product_image_url) {
        throw new Error("Missing script or product image");
      }

      // Generate shots using edge function
      const { data, error } = await supabase.functions.invoke('generate-product-shot', {
        body: {
          projectId,
          script: project.script,
          productImageUrl: project.product_image_url,
        },
      });

      if (error) throw error;

      // Update project status
      await supabase
        .from('product_ad_projects')
        .update({ status: 'shots_generated' })
        .eq('id', projectId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ad-shots"] });
      toast.success("Shots generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const approveShot = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase
        .from('product_ad_shots')
        .update({ status: 'approved' })
        .eq('id', shotId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ad-shots"] });
      toast.success("Shot approved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const rejectShot = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase
        .from('product_ad_shots')
        .update({ status: 'rejected' })
        .eq('id', shotId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ad-shots"] });
      toast.success("Shot rejected");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!projectId || !project) {
    return (
      <div className="text-center text-gray-500 py-8">
        Please generate a script first
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">{project.title}</h2>
        <Button
          onClick={() => generateShots.mutate()}
          disabled={generateShots.isPending || !project.script}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {generateShots.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Shots...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Shots
            </>
          )}
        </Button>
      </div>

      {shots && shots.length > 0 && (
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {shots.map((shot) => (
              <div
                key={shot.id}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  shot.status === 'approved'
                    ? 'border-green-500'
                    : shot.status === 'rejected'
                    ? 'border-red-500'
                    : 'border-gray-700'
                }`}
              >
                <img
                  src={shot.image_url}
                  alt={`Shot ${shot.order_index}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveShot.mutate(shot.id)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={shot.status === 'approved'}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectShot.mutate(shot.id)}
                    disabled={shot.status === 'rejected'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
