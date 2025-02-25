
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./ProfileForm";
import Plans from "@/pages/Plans";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

interface MobileSettingsTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profileFormProps: React.ComponentProps<typeof ProfileForm>;
}

export const MobileSettingsTabs = ({
  activeTab,
  setActiveTab,
  profileFormProps,
}: MobileSettingsTabsProps) => {
  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full space-y-6"
    >
      <div className="border-b sticky top-0 bg-background z-10">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="profile" className="space-y-6 pb-16">
        <ProfileForm {...profileFormProps} />
        <div className="mt-6">
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
      </TabsContent>
      
      <TabsContent value="plans" className="space-y-6 pb-16">
        <Plans />
      </TabsContent>
    </Tabs>
  );
};
