
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const AboutUs = () => {
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-8">
            <h1 className="text-3xl font-bold mb-6">About Mann Media Agency</h1>
            <div className="prose prose-gray max-w-4xl">
              <p className="text-lg mb-4">
                Welcome to Mann Media Agency, your premier destination for innovative video content creation and AI-powered media solutions.
              </p>
              <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
              <p className="mb-4">
                We strive to revolutionize content creation by combining cutting-edge AI technology with creative expertise, 
                making professional video production accessible to businesses of all sizes.
              </p>
              <h2 className="text-2xl font-semibold mt-8 mb-4">Our Services</h2>
              <ul className="list-disc pl-6 mb-6">
                <li className="mb-2">AI-powered video generation</li>
                <li className="mb-2">Professional product photography</li>
                <li className="mb-2">Social media content creation</li>
                <li className="mb-2">Video editing and enhancement</li>
                <li className="mb-2">Metadata management</li>
              </ul>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AboutUs;
