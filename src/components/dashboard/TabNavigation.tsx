
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { memo } from "react";

type ContentType = "all" | "stories" | "images" | "videos";

interface TabNavigationProps {
  activeTab: ContentType;
  onTabChange: (value: ContentType) => void;
}

export const TabNavigation = memo(({ activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <TabsList>
      <TabsTrigger value="all">All Content</TabsTrigger>
      <TabsTrigger value="stories">Stories</TabsTrigger>
      <TabsTrigger value="images">Images</TabsTrigger>
      <TabsTrigger value="videos">Videos</TabsTrigger>
    </TabsList>
  );
});

TabNavigation.displayName = "TabNavigation";
