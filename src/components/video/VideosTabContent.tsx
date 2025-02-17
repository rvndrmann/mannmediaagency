
interface VideoData {
  id: string;
  result_url: string;
  prompt: string;
  created_at: string;
  video_metadata: { id: string } | null;
}

interface VideosTabContentProps {
  videos: VideoData[];
  selectedId?: string;
  onVideoSelect: (id: string) => void;
  showMetadata: boolean;
}

export const VideosTabContent = ({ videos, selectedId, onVideoSelect, showMetadata }: VideosTabContentProps) => {
  return (
    <div className="flex gap-6">
      <div className="w-1/3">
        <div className="space-y-4">
          {videos?.map((video) => (
            <div
              key={video.id}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                video.id === selectedId
                  ? "bg-purple-600"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
              onClick={() => onVideoSelect(video.id)}
            >
              {video.result_url && (
                <video
                  src={video.result_url}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
              )}
              <p className="text-sm text-white/90 line-clamp-2">
                {video.prompt}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {new Date(video.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1">
        {showMetadata ? (
          <VideoMetadataManager videoJobId={selectedId!} />
        ) : (
          <div className="text-center text-white/70 py-8 bg-gray-800/50 rounded-lg">
            Select a video from the list to manage its metadata
          </div>
        )}
      </div>
    </div>
  );
};
