
import { ShowcaseVideo } from "../types/showcase";
import { VideoCard } from "./VideoCard";

interface MobileShowcaseProps {
  videos: ShowcaseVideo[];
  videoErrors: { [key: string]: boolean };
  loadingVideos: { [key: string]: boolean };
  playingVideoId: string | null;
  onVideoError: (videoId: string) => void;
  onVideoLoad: (videoId: string) => void;
  onPlayStateChange: (videoId: string | null) => void;
}

export const MobileShowcase = ({
  videos,
  videoErrors,
  loadingVideos,
  playingVideoId,
  onVideoError,
  onVideoLoad,
  onPlayStateChange,
}: MobileShowcaseProps) => {
  return (
    <div className="flex flex-col space-y-8 px-4">
      {videos.map((video) => (
        <div key={video.id} className="w-full">
          <VideoCard
            video={video}
            onVideoError={onVideoError}
            onVideoLoad={onVideoLoad}
            isLoading={loadingVideos[video.id]}
            hasError={videoErrors[video.id]}
            isPlaying={playingVideoId === video.id}
            onPlayStateChange={onPlayStateChange}
          />
        </div>
      ))}
    </div>
  );
};
