
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Explore = () => {
  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl md:text-2xl font-bold">Explore</h1>
        </div>
      </div>
      
      <div className="text-gray-500 text-center py-12">
        Coming soon: Discover and share amazing content from the community!
      </div>
    </div>
  );
};

export default Explore;
