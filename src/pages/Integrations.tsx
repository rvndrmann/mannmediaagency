
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Youtube, Instagram, Twitter } from "lucide-react";

const Integrations = () => {
  return (
    <SidebarProvider>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
            <p className="text-gray-500">Connect your favorite platforms and tools</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <Youtube className="w-8 h-8 text-red-600" />
                  <div>
                    <h3 className="font-semibold">YouTube</h3>
                    <p className="text-sm text-gray-500">Upload videos directly</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Connect</Button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <Instagram className="w-8 h-8 text-pink-600" />
                  <div>
                    <h3 className="font-semibold">Instagram</h3>
                    <p className="text-sm text-gray-500">Share to your feed</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Connect</Button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <Twitter className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="font-semibold">Twitter</h3>
                    <p className="text-sm text-gray-500">Post automatically</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Connect</Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Integrations;
