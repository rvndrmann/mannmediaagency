
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FilterBar } from "./dashboard/FilterBar";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { DashboardContent } from "./dashboard/DashboardContent";

type ContentType = "all" | "stories" | "images" | "videos";

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<ContentType>("all");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="flex-1 p-4 md:p-8">
      <DashboardHeader />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <DashboardContent
        userId={session?.user?.id}
        activeTab={activeTab}
        page={page}
        searchQuery={searchQuery}
        dateRange={dateRange}
        onTabChange={setActiveTab}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
};
