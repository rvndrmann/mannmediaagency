
import { User, Upload } from "lucide-react";

interface AvatarUploadProps {
  avatarUrl: string | null;
  uploading: boolean;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AvatarUpload = ({ avatarUrl, uploading, onUpload }: AvatarUploadProps) => {
  return (
    <div className="relative group">
      <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <User className="h-8 w-8 text-gray-400" />
        )}
      </div>
      <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
        <Upload className="h-4 w-4 text-white" />
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={onUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
};
