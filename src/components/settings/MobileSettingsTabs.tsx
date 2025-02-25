
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileForm } from "./ProfileForm";
import Plans from "@/pages/Plans";

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
      <div className="border-b sticky top-0 bg-background z-10 pb-2">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="profile" className="space-y-6 pb-16">
        <ProfileForm {...profileFormProps} />
      </TabsContent>
      
      <TabsContent value="plans" className="space-y-6 pb-16">
        <Plans />
      </TabsContent>
    </Tabs>
  );
};
