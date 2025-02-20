
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AnnouncementBanner } from "../announcements/AnnouncementBanner";
import { memo } from "react";

export const DashboardHeader = memo(() => {
  return (
    <>
      <AnnouncementBanner />
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        </div>
      </div>
    </>
  );
});

DashboardHeader.displayName = "DashboardHeader";
