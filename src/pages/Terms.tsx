
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Terms = () => {
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-8">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
            <div className="prose prose-gray max-w-4xl">
              <p className="text-lg mb-6">Last updated: {new Date().toLocaleDateString()}</p>
              
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="mb-4">
                  By accessing and using Mann Media Agency's services, you agree to be bound by these Terms of Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Service Usage</h2>
                <p className="mb-4">You agree to:</p>
                <ul className="list-disc pl-6 mb-6">
                  <li>Provide accurate information</li>
                  <li>Use the service legally and responsibly</li>
                  <li>Not violate any intellectual property rights</li>
                  <li>Maintain the security of your account</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Content Rights</h2>
                <p className="mb-4">
                  You retain rights to your content, but grant us license to use it for providing our services.
                </p>
              </section>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Terms;
