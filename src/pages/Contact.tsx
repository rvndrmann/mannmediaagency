
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Phone } from "lucide-react";

const Contact = () => {
  return (
    <SidebarProvider>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
            <p className="text-gray-500">Get in touch with our support team</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input placeholder="Your name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" placeholder="Your email" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Message</label>
                  <Textarea placeholder="How can we help?" className="min-h-[120px]" />
                </div>
                <Button className="w-full">Send Message</Button>
              </form>
            </Card>

            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center space-x-4">
                  <Mail className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Email Us</h3>
                    <p className="text-sm text-gray-500">support@mannmediaagency.com</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-4">
                  <Phone className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Call Us</h3>
                    <p className="text-sm text-gray-500">+1 (555) 123-4567</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-4">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">Live Chat</h3>
                    <p className="text-sm text-gray-500">Available 24/7</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Contact;
