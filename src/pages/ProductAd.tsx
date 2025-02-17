
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ProductAdScriptGenerator } from "@/components/product-ad/ProductAdScriptGenerator";
import { ProductAdShots } from "@/components/product-ad/ProductAdShots";
import { ProductAdVideoGenerator } from "@/components/product-ad/ProductAdVideoGenerator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ProductAd = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'script' | 'shots' | 'video'>('script');
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/auth/login");
        return null;
      }
      return session;
    },
  });

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

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
    enabled: !!projectId && !!session,
  });

  const handleStepComplete = (step: 'script' | 'shots' | 'video', newProjectId?: string) => {
    if (newProjectId) {
      setProjectId(newProjectId);
    }
    
    switch (step) {
      case 'script':
        setCurrentStep('shots');
        break;
      case 'shots':
        setCurrentStep('video');
        break;
      case 'video':
        navigate("/");
        break;
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="flex-1 p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="mr-4 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-white">Product Ad Creator</h1>
          </div>
          <div className="text-sm text-gray-400">
            Credits: {userCredits?.credits_remaining || 0}
          </div>
        </div>

        <div className="space-y-8">
          {currentStep === 'script' && (
            <ProductAdScriptGenerator
              onComplete={(projectId) => handleStepComplete('script', projectId)}
            />
          )}

          {currentStep === 'shots' && projectId && (
            <ProductAdShots
              projectId={projectId}
              onComplete={() => handleStepComplete('shots')}
            />
          )}

          {currentStep === 'video' && projectId && (
            <ProductAdVideoGenerator
              projectId={projectId}
              onComplete={() => handleStepComplete('video')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductAd;
