
import { Button } from "@/components/ui/button";

interface ProductAdVideoGeneratorProps {
  projectId: string | null;
  onComplete: () => void;
}

export const ProductAdVideoGenerator = ({ projectId, onComplete }: ProductAdVideoGeneratorProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Generate Video</h2>
      <p className="text-gray-400">Video generation will be implemented in a future update.</p>
      <Button disabled className="w-full">Generate Video</Button>
    </div>
  );
};
