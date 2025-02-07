
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar as SidebarComponent, SidebarContent } from "@/components/ui/sidebar";
import { UserProfile } from "./sidebar/UserProfile";
import { NavigationMenu } from "./sidebar/NavigationMenu";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarFooter } from "./sidebar/SidebarFooter";

export const Sidebar = () => {
  const { data: userCredits, error: creditsError } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      console.log("Fetching user credits...");
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        throw error;
      }
      console.log("User credits data:", data);
      return data;
    },
  });

  const { data: user, error: userError } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      console.log("Fetching user data...");
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        throw error;
      }
      console.log("User data:", user);
      return user;
    },
  });

  if (creditsError) {
    console.error("Credits Error:", creditsError);
  }

  if (userError) {
    console.error("User Error:", userError);
  }

  const availableStories = Math.floor((userCredits?.credits_remaining || 0) / 10);
  const hasEnoughCredits = (userCredits?.credits_remaining || 0) >= 10;

  return (
    <SidebarComponent collapsible="none" className="w-64 h-screen bg-gray-900">
      <SidebarHeader />
      <SidebarContent>
        <div className="space-y-4 px-4">
          <UserProfile 
            email={user?.email}
            availableStories={availableStories}
            creditsRemaining={userCredits?.credits_remaining || 0}
          />
          <NavigationMenu hasEnoughCredits={hasEnoughCredits} />
        </div>
      </SidebarContent>
      <SidebarFooter />
    </SidebarComponent>
  );
};
