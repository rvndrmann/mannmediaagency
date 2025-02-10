
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-video bg-gray-800 rounded-xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos?.map((video) => (
        <div
          key={video.id}
          className="group relative aspect-video rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl"
        >
          {/* Video Player */}
          <video
            className="w-full h-full object-cover"
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
          
          {/* Dark Gradient Overlay - Always visible */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

          {/* Content Overlay */}
          <div className="absolute inset-0 p-6 flex flex-col justify-between transform transition-transform duration-300">
            {/* Top Section with Category */}
            <div className="flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="inline-block px-3 py-1 bg-purple-600/90 text-xs font-medium text-white rounded-full">
                {video.category}
              </span>
            </div>

            {/* Bottom Section with Title and Description */}
            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform">
              <h3 className="text-white text-xl font-bold mb-2 drop-shadow-lg">
                {video.title}
              </h3>
              <p className="text-gray-200 text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {video.description}
              </p>
            </div>
          </div>

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-0 transition-opacity duration-300">
            <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
