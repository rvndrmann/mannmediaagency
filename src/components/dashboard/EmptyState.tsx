
import { FolderOpen } from "lucide-react";

export interface EmptyStateProps {
  type: "all" | "stories" | "images" | "videos";
}

export const EmptyState = ({ type }: EmptyStateProps) => {
  const getMessage = () => {
    switch (type) {
      case "stories":
        return "No stories found";
      case "images":
        return "No images found";
      case "videos":
        return "No videos found";
      case "all":
      default:
        return "No content found";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">{getMessage()}</h3>
      <p className="text-sm text-gray-500">
        Start creating content to see it here
      </p>
    </div>
  );
};
