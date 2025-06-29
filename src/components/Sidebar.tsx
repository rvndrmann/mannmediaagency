
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Sidebar as SidebarComponent, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSection } from "./sidebar/ProfileSection";
import { Navigation } from "./sidebar/Navigation";

export const Sidebar = () => {
  const { signOut } = useAuth(); // Call useAuth at the top level
  const [isSigningOut, setIsSigningOut] = useState(false);
  return (
    <SidebarComponent>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="text-xl font-bold text-white">Create Amazing Videos</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-4 px-4">
          <ProfileSection />
          <Navigation />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            disabled={isSigningOut}
            onClick={() => {
              setIsSigningOut(true);
              setTimeout(async () => {
                await signOut();
              }, 1500);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
};
