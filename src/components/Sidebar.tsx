
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Sidebar as SidebarComponent, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { ProfileSection } from "./sidebar/ProfileSection";
import { Navigation } from "./sidebar/Navigation";

export const Sidebar = () => {
  return (
    <SidebarComponent className="bg-cream-50 border-r border-cream-100">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="text-xl font-bold text-gray-800">Mann Media Agency</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-4 px-4">
          <ProfileSection />
          <Navigation />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-cream-100"
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
