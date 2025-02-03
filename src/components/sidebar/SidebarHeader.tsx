import { SidebarHeader as Header } from "@/components/ui/sidebar";

export const SidebarHeader = () => {
  return (
    <Header>
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="text-xl font-bold text-white">Lovable</div>
      </div>
    </Header>
  );
};