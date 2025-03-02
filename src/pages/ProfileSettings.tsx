
import { useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { MobileSettingsTabs } from "@/components/settings/MobileSettingsTabs";

// Memo-ize the loading component to prevent unnecessary re-renders
const LoadingView = memo(() => (
  <SidebarProvider>
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-8">Loading...</div>
      </div>
    </div>
  </SidebarProvider>
));

LoadingView.displayName = "LoadingView";

const ProfileSettings = () => {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      if (!username && data.username) {
        setUsername(data.username);
      }
      if (!avatarUrl && data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache profile data for 5 minutes
  });

  const updateProfile = useMutation({
    mutationFn: async ({ newUsername, newAvatarUrl }: { newUsername: string, newAvatarUrl?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: existingUser, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", newUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) throw new Error("Username is already taken");

      const updates = {
        username: newUsername,
        ...(newAvatarUrl !== undefined && { avatar_url: newAvatarUrl }),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        if (error.message.includes("username")) {
          throw new Error("Username is invalid or already taken");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully");
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      if (error.message.includes("taken")) {
        toast.error("This username is already taken. Please choose another one.");
      } else if (error.message.includes("invalid")) {
        toast.error("Please enter a valid username");
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
      setIsSubmitting(false);
    },
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      toast.error("Username cannot be empty");
      return;
    }

    if (trimmedUsername.length < 3) {
      toast.error("Username must be at least 3 characters long");
      return;
    }

    if (trimmedUsername === profile?.username) {
      toast.info("No changes to save");
      return;
    }

    setIsSubmitting(true);
    updateProfile.mutate({ newUsername: trimmedUsername, newAvatarUrl: avatarUrl });
  }, [username, profile?.username, avatarUrl, updateProfile]);

  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      updateProfile.mutate({ newUsername: username, newAvatarUrl: publicUrl });
      setAvatarUrl(publicUrl);

    } catch (error) {
      toast.error("Error uploading avatar!");
      console.error(error);
    } finally {
      setUploading(false);
    }
  }, [username, updateProfile]);

  if (isLoading) {
    return <LoadingView />;
  }

  const profileFormProps = {
    username,
    setUsername,
    isSubmitting,
    uploading,
    avatarUrl,
    handleSubmit,
    handleAvatarUpload,
    currentUsername: profile?.username,
  };

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 p-8">
            {isMobile ? (
              <MobileSettingsTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                profileFormProps={profileFormProps}
              />
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
                <ProfileForm {...profileFormProps} />
              </>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProfileSettings;
