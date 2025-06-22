
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Sidebar as SidebarComponent, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSection } from "./sidebar/ProfileSection";
import { Navigation } from "./sidebar/Navigation";

export const Sidebar = () => {
  const { signOut } = useAuth();
  
  return (
    <SidebarComponent className="bg-white border-r border-gray-200 shadow-sm">
      <SidebarHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="text-xl font-bold text-gray-900">Create Amazing Videos</div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <div className="space-y-4 px-4">
          <ProfileSection />
          <Navigation />
        </div>
      </SidebarContent>
      <SidebarFooter className="bg-white border-t border-gray-200">
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={async () => {
              await signOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
};
