
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, RocketIcon, TagIcon, Camera, Video, Play, RefreshCw } from "lucide-react";
import { VideoShowcase } from "@/components/auth/VideoShowcase";
import { SplashCursor } from "@/components/ui/splash-cursor";

const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <SplashCursor />
      {/* Navigation Bar */}
      <div className="w-full px-6 lg:px-12 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex items-center gap-4 w-full sm:w-auto text-center sm:text-left">
          {/* Removed MANN logo and text */}
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
      <div className="px-6 lg:px-12 py-12 lg:py-24 relative z-10">
        {/* Main Heading */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
            AI-Powered Marketing Tools for Modern Businesses
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Transform your marketing workflow with our suite of AI-powered tools. Create professional product imagery, 
            custom videos, and automate repetitive browsing tasks - all in one platform.
          </p>
        </div>

        {/* Feature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {/* Product Shoot Feature */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all">
            <div className="flex justify-center mb-4">
              <div className="bg-purple-800/50 p-3 rounded-full">
                <Camera className="h-8 w-8 text-purple-200" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white text-center mb-3">Professional Product Imagery</h3>
            <p className="text-gray-300 text-center">
              Transform simple product photos into stunning marketing materials with our AI-powered image generation tools.
            </p>
          </div>

          {/* Video Creation Feature */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all">
            <div className="flex justify-center mb-4">
              <div className="bg-purple-800/50 p-3 rounded-full">
                <Video className="h-8 w-8 text-purple-200" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white text-center mb-3">Custom Video Creation</h3>
            <p className="text-gray-300 text-center">
              Create engaging product videos that convert with our intuitive video generation tools and customizable templates.
            </p>
          </div>

          {/* Browser Automation Feature */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all">
            <div className="flex justify-center mb-4">
              <div className="bg-purple-800/50 p-3 rounded-full">
                <RefreshCw className="h-8 w-8 text-purple-200" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white text-center mb-3">Browser Worker AI</h3>
            <p className="text-gray-300 text-center">
              Automate repetitive online tasks with our intelligent browser automation that mimics human browsing behavior.
            </p>
          </div>
        </div>

        {/* Image to Video Feature Highlight */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-8 max-w-4xl mx-auto mb-16 border border-purple-500/20">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-purple-800/50 p-4 rounded-full">
              <Play className="h-10 w-10 text-purple-200" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-white mb-2">Image to Video Conversion</h3>
              <p className="text-gray-300">
                Turn static images into dynamic videos that capture attention. Our advanced AI technology adds motion, 
                effects, and professional transitions to make your products stand out.
              </p>
            </div>
          </div>
        </div>

        {/* Powered By Section */}
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

        {/* Video Showcase */}
        <div className="w-full max-w-[1400px] mx-auto relative z-10">
          <VideoShowcase />
        </div>
      </div>
    </div>
  );
};

export default Auth;
