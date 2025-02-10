
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, RocketIcon, TagIcon, Menu } from "lucide-react";
import { VideoShowcase } from "@/components/auth/VideoShowcase";

const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {/* Navigation Bar */}
      <div className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-2xl font-bold text-white w-full sm:w-auto text-center sm:text-left">
          mannmediaagency
        </div>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
          <Button
            onClick={() => navigate("/auth/login")}
            variant="ghost"
            className="text-gray-200 hover:text-white hover:bg-white/10 text-sm sm:text-base"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
          <Button
            onClick={() => navigate("/plans")}
            variant="ghost"
            className="text-gray-200 hover:text-white hover:bg-white/10 text-sm sm:text-base"
          >
            <TagIcon className="mr-2 h-4 w-4" />
            Pricing
          </Button>
          <Button
            onClick={() => navigate("/auth/signup")}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base"
          >
            <RocketIcon className="mr-2 h-4 w-4" />
            Start Now
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8 sm:py-12">
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-center">
          {/* Left side - Video Showcase */}
          <div className="w-full lg:w-7/12 space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Create Amazing Videos with AI
              </h1>
              <p className="text-gray-300 text-base sm:text-lg">
                Transform your content into engaging videos in minutes
              </p>
            </div>
            <VideoShowcase />
            
            {/* Powered By Section */}
            <div className="pt-8 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4 text-center">Powered by</p>
              <div className="flex justify-center items-center gap-4 sm:gap-8 flex-wrap px-2">
                <div className="flex items-center space-x-2">
                  <img 
                    src="/lovable-uploads/a0d067e3-31c4-4460-9f9b-7c01de698cb0.png"
                    alt="Kling AI Logo"
                    className="h-5 sm:h-6 w-auto"
                  />
                  <span className="text-gray-300 text-xs sm:text-sm">Kling AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <img 
                    src="/lovable-uploads/4fef3d5e-6027-4434-ac33-efd08f0819df.png"
                    alt="Eleven Labs Logo"
                    className="h-5 sm:h-6 w-auto"
                  />
                  <span className="text-gray-300 text-xs sm:text-sm">Eleven Labs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <img 
                    src="/lovable-uploads/76ac2028-1545-407e-b33f-378f4dd531a1.png"
                    alt="ChatGPT-4o Logo"
                    className="h-5 sm:h-6 w-auto"
                  />
                  <span className="text-gray-300 text-xs sm:text-sm">ChatGPT-4o</span>
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
