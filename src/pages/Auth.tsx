
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
        <div className="text-2xl font-bold text-white">Logo</div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
