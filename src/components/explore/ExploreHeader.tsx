
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ExploreHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 mb-6">
      <SidebarTrigger className="md:hidden" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="mr-2"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-xl md:text-2xl font-bold">Explore</h1>
    </div>
  );
};
