
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProductShotV1 = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateProductShot = async (
    prompt: string,
    sourceImageUrl: string,
    settings: {
      size?: string;
      inferenceSteps?: number;
      guidanceScale?: number;
      outputFormat?: string;
    } = {}
  ) => {
    setIsGenerating(true);
    setError(null);
    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke(
        "product-shot-v1",
        {
          body: {
            prompt,
            sourceImageUrl,
            settings: {
              size: settings.size || "768x768",
              inferenceSteps: settings.inferenceSteps || 30,
              guidanceScale: settings.guidanceScale || 7.5,
              outputFormat: (settings.outputFormat || "PNG").toUpperCase(),
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.imageUrl) {
        throw new Error("No image URL received from the server");
      }

      // Record the job in the database for history
      const { error: dbError } = await supabase
        .from("image_generation_jobs")
        .insert({
          prompt,
          source_image_url: sourceImageUrl,
          result_url: data.imageUrl,
          status: 'in_queue', // Using the new enum value
          settings: settings,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) {
        console.error("Error recording generation in database:", dbError);
        // Don't fail the whole operation if recording fails
      }

      setGeneratedImageUrl(data.imageUrl);
      return data.imageUrl;
    } catch (err) {
      console.error("Error generating product shot:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error occurred during generation";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generatedImageUrl,
    error,
    generateProductShot,
  };
};
