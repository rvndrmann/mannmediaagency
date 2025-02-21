
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const FilterBar = ({
  searchQuery,
  onSearchChange,
}: FilterBarProps) => {
  return (
    <div className="flex gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
};
