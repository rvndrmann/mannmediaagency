
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductImage {
  id: string;
  url: string;
  prompt: string;
  source: 'v1' | 'v2';
}

interface ProductImageGridProps {
  images: ProductImage[];
  onSelectImage: (jobId: string, imageUrl: string) => void;
}

export const ProductImageGrid = ({ images, onSelectImage }: ProductImageGridProps) => {
  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white mb-6">
          Select from Generated Product Shots
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="group relative overflow-hidden bg-[#2A2A2A] rounded-lg border border-gray-800 transition-all hover:border-purple-500"
            >
              <img 
                src={image.url} 
                alt={image.prompt} 
                className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                onClick={() => onSelectImage(image.id, image.url)}
              />
              <div className="absolute inset-0 flex flex-col justify-between p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex justify-end">
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">
                    {image.source === 'v1' ? 'V1' : 'V2'}
                  </span>
                </div>
                <div className="bg-black/75 p-2 rounded">
                  <p className="text-white text-sm line-clamp-2">{image.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
