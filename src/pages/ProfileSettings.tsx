import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { User, Upload } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plans } from "./Plans";

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
      
      if (!username) {
        setUsername(data.username || "");
      }
      if (!avatarUrl) {
        setAvatarUrl(data.avatar_url);
      }
      
      return data;
    },
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

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex flex-col min-h-screen w-full bg-background">
          <div className="flex flex-1">
            <Sidebar />
            <div className="flex-1 p-8">Loading...</div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const renderProfileContent = () => (
    <>
      <Card className="max-w-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
              <Upload className="h-4 w-4 text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <div>
            <h2 className="text-lg font-medium">Your Profile</h2>
            <p className="text-sm text-gray-500">
              Current username: {profile?.username || "No username set"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              New Username
            </label>
            <Input
              id="username"
              placeholder="Enter new username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting || uploading}>
            {isSubmitting ? "Updating..." : "Update Profile"}
          </Button>
        </form>
      </Card>
    </>
  );

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 p-8">
            {isMobile ? (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full space-y-6"
              >
                <div className="border-b sticky top-0 bg-background z-10 pb-2">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="plans">Plans</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="profile" className="space-y-6 pb-16">
                  {renderProfileContent()}
                </TabsContent>
                
                <TabsContent value="plans" className="space-y-6 pb-16">
                  <Plans />
                </TabsContent>
              </Tabs>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
                {renderProfileContent()}
              </>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProfileSettings;
