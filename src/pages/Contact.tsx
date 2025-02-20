
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";

const Contact = () => {
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-8">
            <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
            <div className="max-w-2xl">
              <p className="text-lg mb-6">
                Have questions or need assistance? We're here to help! Fill out the form below and we'll get back to you as soon as possible.
              </p>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">Name</label>
                  <Input id="name" placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">Message</label>
                  <Textarea id="message" placeholder="How can we help you?" className="min-h-[150px]" />
                </div>
                <Button className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Contact;
