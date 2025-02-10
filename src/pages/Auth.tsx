
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, RocketIcon, TagIcon } from "lucide-react";
import { VideoShowcase } from "@/components/auth/VideoShowcase";

const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {/* Navigation Bar */}
      <div className="w-full px-6 lg:px-12 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-2xl font-bold text-white w-full sm:w-auto text-center sm:text-left">
          mannmediaagency
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
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
      <div className="px-6 lg:px-12 py-12 lg:py-24">
        {/* Powered By Section - Moved above main content */}
        <div className="text-center mb-16">
          <p className="text-gray-400 text-sm mb-6">Powered by</p>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/a0d067e3-31c4-4460-9f9b-7c01de698cb0.png"
                alt="Kling AI Logo"
                className="h-6 w-auto"
              />
              <span className="text-gray-300">Kling AI</span>
            </div>
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/4fef3d5e-6027-4434-ac33-efd08f0819df.png"
                alt="Eleven Labs Logo"
                className="h-6 w-auto"
              />
              <span className="text-gray-300">Eleven Labs</span>
            </div>
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/76ac2028-1545-407e-b33f-378f4dd531a1.png"
                alt="ChatGPT-4o Logo"
                className="h-6 w-auto"
              />
              <span className="text-gray-300">ChatGPT-4o</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
          {/* Left Column - Text Content */}
          <div className="w-full lg:w-1/2 space-y-8">
            <div className="text-center lg:text-left space-y-6">
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                Create Amazing Videos with AI
              </h1>
              <p className="text-xl text-gray-300">
                Transform your content into engaging videos in minutes
              </p>
            </div>
          </div>

          {/* Right Column - Video Showcase */}
          <div className="w-full lg:w-1/2">
            <VideoShowcase />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
