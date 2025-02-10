
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ShowcaseVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  is_visible: boolean;
  story_id: number | null;
}

interface Story {
  "stories id": number;
  final_video_with_music: string | null;
  source: string | null;
}

export const VideoVisibilityTable = () => {
  const queryClient = useQueryClient();

  const { data: videos, isLoading: isVideosLoading } = useQuery({
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

  const { data: stories, isLoading: isStoriesLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select('"stories id", final_video_with_music, source');
      
      if (error) throw error;
      return data as Story[];
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
      toast.success("Visibility updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update visibility");
      console.error("Error updating visibility:", error);
    },
  });

  const updateStoryId = useMutation({
    mutationFn: async ({ id, story_id }: { id: string; story_id: number | null }) => {
      const { error } = await supabase
        .from("auth_showcase_videos")
        .update({ story_id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcaseVideos"] });
      toast.success("Story assigned successfully");
    },
    onError: (error) => {
      toast.error("Failed to assign story");
      console.error("Error assigning story:", error);
    },
  });

  if (isVideosLoading || isStoriesLoading) {
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
            <TableHead>Story ID</TableHead>
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
                <Select
                  value={video.story_id?.toString() || "null"}
                  onValueChange={(value) => {
                    updateStoryId.mutate({
                      id: video.id,
                      story_id: value === "null" ? null : parseInt(value),
                    });
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a story" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {stories?.map((story) => (
                      <SelectItem 
                        key={story["stories id"]} 
                        value={story["stories id"].toString()}
                      >
                        Story #{story["stories id"]}
                        {story.source ? ` - ${story.source.substring(0, 30)}...` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
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
