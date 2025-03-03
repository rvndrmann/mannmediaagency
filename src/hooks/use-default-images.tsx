
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DefaultImage {
  id: string;
  url: string;
  name: string;
  context: string;
  user_id: string;
  created_at: string;
  last_used_at: string | null;
}

export const useDefaultImages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  // Fetch default images for the current user
  const { data: defaultImages, isLoading } = useQuery({
    queryKey: ["defaultImages"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("default_product_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching default images:", error);
        toast({
          title: "Error",
          description: "Failed to load your default images",
          variant: "destructive",
        });
        return [];
      }

      return data as DefaultImage[];
    },
  });

  // Save a new default image
  const { mutate: saveDefaultImage } = useMutation({
    mutationFn: async ({ imageUrl, name, context }: { imageUrl: string; name: string; context?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("default_product_images")
        .insert({
          url: imageUrl,
          name,
          context: context || "product",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defaultImages"] });
      toast({
        title: "Success",
        description: "Default image saved successfully",
      });
    },
    onError: (error) => {
      console.error("Error saving default image:", error);
      toast({
        title: "Error",
        description: "Failed to save default image",
        variant: "destructive",
      });
    },
  });

  // Update last used timestamp
  const { mutate: markAsUsed } = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("default_product_images")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defaultImages"] });
    },
  });

  // Delete a default image
  const { mutate: deleteDefaultImage } = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("default_product_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defaultImages"] });
      toast({
        title: "Success",
        description: "Default image deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting default image:", error);
      toast({
        title: "Error",
        description: "Failed to delete default image",
        variant: "destructive",
      });
    },
  });

  // Upload a new image to be saved as default
  const uploadAndSaveDefaultImage = async (file: File, name: string, context?: string) => {
    try {
      setIsUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `default_images/${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('product_photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('product_photos')
        .getPublicUrl(filePath);

      // Save as default image
      saveDefaultImage({
        imageUrl: urlData.publicUrl,
        name,
        context,
      });

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading default image:", error);
      toast({
        title: "Error",
        description: "Failed to upload and save default image",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    defaultImages,
    isLoading,
    isUploading,
    saveDefaultImage,
    markAsUsed,
    deleteDefaultImage,
    uploadAndSaveDefaultImage,
  };
};
