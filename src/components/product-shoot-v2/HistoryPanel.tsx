
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

interface ProductShotHistory {
  id: string;
  source_image_url: string;
  result_url: string;
  scene_description?: string;
  ref_image_url?: string;
  created_at: string;
}

export function HistoryPanel() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["product-shot-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_shot_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProductShotHistory[];
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="grid grid-cols-2 gap-4 p-4">
        {history?.map((item) => (
          <div
            key={item.id}
            className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800"
          >
            <img
              src={item.result_url}
              alt={item.scene_description || "Generated product shot"}
              className="w-full aspect-square object-cover"
            />
            <div className="p-3 space-y-2">
              {item.scene_description && (
                <p className="text-sm text-gray-300 line-clamp-2">
                  {item.scene_description}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
