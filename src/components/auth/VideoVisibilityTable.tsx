
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface ShowcaseVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  is_visible: boolean;
}

export const VideoVisibilityTable = () => {
  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useQuery({
    queryKey: ["showcaseVideos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_showcase_videos")
        .select("*")
        .order("order");
      
      if (error) throw error;
      return data as ShowcaseVideo[];
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from("auth_showcase_videos")
        .update({ is_visible })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcaseVideos"] });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thumbnail</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Visible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos?.map((video) => (
            <TableRow key={video.id}>
              <TableCell>
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-24 h-16 object-cover rounded"
                />
              </TableCell>
              <TableCell className="font-medium">{video.title}</TableCell>
              <TableCell>{video.category}</TableCell>
              <TableCell>
                <Switch
                  checked={video.is_visible}
                  onCheckedChange={(checked) =>
                    toggleVisibility.mutate({ id: video.id, is_visible: checked })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
