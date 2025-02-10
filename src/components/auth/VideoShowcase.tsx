
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ShowcaseVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
}

export const VideoShowcase = () => {
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-video bg-gray-800 rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {videos?.map((video) => (
        <div
          key={video.id}
          className="group relative aspect-video rounded-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300"
        >
          {/* Video Player */}
          <video
            className="w-full h-full object-cover cursor-pointer"
            poster={video.thumbnail_url}
            preload="none"
            onClick={(e) => {
              const videoEl = e.currentTarget;
              if (videoEl.paused) {
                videoEl.play();
              } else {
                videoEl.pause();
              }
            }}
          >
            <source src={video.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Overlay with information */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-block px-2 py-1 bg-purple-600 text-xs text-white rounded-full mb-2 w-fit">
              {video.category}
            </span>
            <h3 className="text-white font-semibold">{video.title}</h3>
            <p className="text-gray-200 text-sm">{video.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
