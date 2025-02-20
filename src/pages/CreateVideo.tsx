
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Video } from "lucide-react";

const CreateVideo = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Faceless Video</h1>
          <p className="text-gray-500">Transform your content into professional faceless videos</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Upload className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold">Upload Content</h3>
              <p className="text-sm text-gray-500">Upload your script or content to get started</p>
              <Button className="w-full">
                Upload Content
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold">Customize Video</h3>
              <p className="text-sm text-gray-500">Choose style, voice, and background</p>
              <Button variant="outline" className="w-full">
                Customize
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateVideo;
