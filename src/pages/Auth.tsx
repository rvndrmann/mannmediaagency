
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, RocketIcon, TagIcon } from "lucide-react";
import { VideoShowcase } from "@/components/auth/VideoShowcase";

const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {/* Navigation Bar */}
      <div className="w-full px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-white">mannmediaagency</div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate("/auth/login")}
            variant="ghost"
            className="text-gray-200 hover:text-white hover:bg-white/10"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
          <Button
            onClick={() => navigate("/plans")}
            variant="ghost"
            className="text-gray-200 hover:text-white hover:bg-white/10"
          >
            <TagIcon className="mr-2 h-4 w-4" />
            Pricing
          </Button>
          <Button
            onClick={() => navigate("/auth/signup")}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RocketIcon className="mr-2 h-4 w-4" />
            Start Now
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 flex items-center justify-center">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center">
          {/* Left side - Video Showcase */}
          <div className="w-full lg:w-7/12 space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold text-white mb-4">
                Create Amazing Videos with AI
              </h1>
              <p className="text-gray-300 text-lg">
                Transform your content into engaging videos in minutes
              </p>
            </div>
            <VideoShowcase />
            
            {/* Powered By Section */}
            <div className="pt-8 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4 text-center">Powered by</p>
              <div className="flex justify-center items-center gap-8 flex-wrap">
                <div className="flex items-center space-x-2">
                  <img 
                    src="/lovable-uploads/a0d067e3-31c4-4460-9f9b-7c01de698cb0.png"
                    alt="Kling AI Logo"
                    className="h-6 w-auto"
                  />
                  <span className="text-gray-300 text-sm">Kling AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <img 
                    src="/lovable-uploads/4fef3d5e-6027-4434-ac33-efd08f0819df.png"
                    alt="Eleven Labs Logo"
                    className="h-6 w-auto"
                  />
                  <span className="text-gray-300 text-sm">Eleven Labs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <img 
                    src="/lovable-uploads/76ac2028-1545-407e-b33f-378f4dd531a1.png"
                    alt="ChatGPT-4o Logo"
                    className="h-6 w-auto"
                  />
                  <span className="text-gray-300 text-sm">ChatGPT-4o</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
