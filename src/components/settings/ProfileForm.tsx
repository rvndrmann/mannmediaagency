
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarUpload } from "./AvatarUpload";

interface ProfileFormProps {
  username: string;
  setUsername: (username: string) => void;
  isSubmitting: boolean;
  uploading: boolean;
  avatarUrl: string | null;
  handleSubmit: (e: React.FormEvent) => void;
  handleAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  currentUsername: string | undefined;
}

export const ProfileForm = ({
  username,
  setUsername,
  isSubmitting,
  uploading,
  avatarUrl,
  handleSubmit,
  handleAvatarUpload,
  currentUsername,
}: ProfileFormProps) => {
  return (
    <Card className="max-w-2xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <AvatarUpload
          avatarUrl={avatarUrl}
          uploading={uploading}
          onUpload={handleAvatarUpload}
        />
        <div>
          <h2 className="text-lg font-medium">Your Profile</h2>
          <p className="text-sm text-gray-500">
            Current username: {currentUsername || "No username set"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            New Username
          </label>
          <Input
            id="username"
            placeholder="Enter new username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
          />
        </div>
        <Button type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </Card>
  );
};
