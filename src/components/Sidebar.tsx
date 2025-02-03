import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sidebar as SidebarComponent, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "./sidebar/UserProfile";
import { NavigationMenu } from "./sidebar/NavigationMenu";

export const Sidebar = () => {
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
  });

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const availableStories = Math.floor((userCredits?.credits_remaining || 0) / 10);
  const hasEnoughCredits = (userCredits?.credits_remaining || 0) >= 10;

  return (
    <SidebarComponent>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="text-xl font-bold text-white">Lovable</div>
        </div>
      </SidebarHeader>
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
      <SidebarFooter>
        <div className="px-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={async () => {
              await supabase.auth.signOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
};