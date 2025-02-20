
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Heart, Users, Target, Award } from "lucide-react";

const AboutUs = () => {
  return (
    <SidebarProvider>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">About Us</h1>
            <p className="text-gray-500">Learn more about Mann Media Agency</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
              <p className="text-gray-600 leading-relaxed">
                Mann Media Agency was founded with a vision to revolutionize content creation through AI technology. 
                We believe in empowering creators with tools that make high-quality video production accessible to everyone.
              </p>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">10K+</h3>
                  <p className="text-sm text-gray-500">Active Users</p>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Heart className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">98%</h3>
                  <p className="text-sm text-gray-500">Customer Satisfaction</p>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold">50K+</h3>
                  <p className="text-sm text-gray-500">Videos Created</p>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Award className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold">15+</h3>
                  <p className="text-sm text-gray-500">Industry Awards</p>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AboutUs;
