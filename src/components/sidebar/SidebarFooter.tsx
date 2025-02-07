
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SidebarFooter as Footer } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

export const SidebarFooter = () => {
  return (
    <Footer>
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
    </Footer>
  );
};
