
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useDefaultImages } from "@/hooks/use-default-images";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface DefaultImagesButtonProps {
  onSelect: (imageUrl: string) => void;
}

export function DefaultImagesButton({ onSelect }: DefaultImagesButtonProps) {
  const { defaultImages, isLoading, updateLastUsed } = useDefaultImages();

  const handleSelect = (id: string, url: string) => {
    updateLastUsed.mutate(id);
    onSelect(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Star className="h-4 w-4 text-yellow-400" />
          Default Images
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {isLoading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : !defaultImages || defaultImages.length === 0 ? (
          <DropdownMenuItem disabled>No default images</DropdownMenuItem>
        ) : (
          defaultImages.map((image) => (
            <DropdownMenuItem 
              key={image.id}
              onClick={() => handleSelect(image.id, image.url)}
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
              </div>
              <span className="truncate">{image.name}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
