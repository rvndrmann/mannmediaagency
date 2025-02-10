
import { VideoVisibilityTable } from "@/components/auth/VideoVisibilityTable";

export const Dashboard = () => {
  return (
    <main className="flex-1 p-6 overflow-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Manage Showcase Videos</h2>
          <p className="text-gray-500 mb-4">
            Control which videos appear in the showcase and link them to stories.
          </p>
          <VideoVisibilityTable />
        </div>
      </div>
    </main>
  );
};
