
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DefaultProductImage {
  id: string;
  url: string;
  name: string;
  context: string;
  user_id: string;
  created_at: string;
  last_used_at: string | null;
}

export function useDefaultImages() {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all default product images
  const { data: defaultImages, isLoading, error } = useQuery({
    queryKey: ["defaultProductImages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("default_product_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DefaultProductImage[];
    },
  });

  // Save a new default product image
  const saveDefaultImage = useMutation({
    mutationFn: async ({ url, name, context = "product" }: { url: string; name: string; context?: string }) => {
      const { data, error } = await supabase
        .from("default_product_images")
        .insert({
          url,
          name,
          context,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defaultProductImages"] });
      toast({
        title: "Image saved",
        description: "Default product image saved successfully",
      });
    },
    onError: (error) => {
      console.error("Error saving default image:", error);
      toast({
        title: "Error",
        description: "Failed to save default product image",
        variant: "destructive",
      });
    },
  });

  // Update last used timestamp for a default product image
  const updateLastUsed = useMutation({
    mutationFn: async (imageId: string) => {
      const { data, error } = await supabase
        .from("default_product_images")
        .update({
          last_used_at: new Date().toISOString(),
        })
        .eq("id", imageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defaultProductImages"] });
    },
  });

  // Delete a default product image
  const deleteDefaultImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("default_product_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defaultProductImages"] });
      toast({
        title: "Image deleted",
        description: "Default product image deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting default image:", error);
      toast({
        title: "Error",
        description: "Failed to delete default product image",
        variant: "destructive",
      });
    },
  });

  // Upload an image to storage and save as default
  const uploadAndSaveDefaultImage = async (file: File, name: string, context = "product") => {
    try {
      setIsUploading(true);
      
      // Upload to storage
      const filePath = `default-images/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("product-photos")
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      // Save to database
      await saveDefaultImage.mutateAsync({
        url: publicUrlData.publicUrl,
        name,
        context,
      });

      setIsUploading(false);
      return publicUrlData.publicUrl;
    } catch (error) {
      setIsUploading(false);
      console.error("Error uploading and saving default image:", error);
      toast({
        title: "Error",
        description: "Failed to upload and save default image",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    defaultImages,
    isLoading,
    error,
    isUploading,
    saveDefaultImage,
    updateLastUsed,
    deleteDefaultImage,
    uploadAndSaveDefaultImage,
  };
}
