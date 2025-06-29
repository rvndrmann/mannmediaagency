
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, RocketIcon, TagIcon, Camera, Video, Play, RefreshCw, Check, Upload, CreditCard, Clock } from "lucide-react";
import { VideoShowcase } from "@/components/auth/VideoShowcase";
import { SplashCursor } from "@/components/ui/splash-cursor";

const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
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
            className="text-foreground hover:text-foreground/80"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
          <Button
            onClick={() => navigate("/plans")}
            variant="ghost"
            className="text-foreground hover:text-foreground/80"
          >
            <TagIcon className="mr-2 h-4 w-4" />
            Pricing
          </Button>
          <Button
            onClick={() => navigate("/auth/signup")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
            AI Ads that win.
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Winning creative, made and tested for you.
            <br />
            (yes, it’s really that simple)
          </p>
          <Button
            onClick={() => navigate("/auth/signup")}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
          >
            <Upload className="mr-2 h-5 w-5" /> Upload & Order Now
          </Button>
        </div>

        {/* How It Works Section */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-8">How It Works:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg text-muted-foreground">Upload product image, character image, or product with character</p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg text-muted-foreground">Make payment using credits</p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg text-muted-foreground">Get your video in minutes — right in your dashboard</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">No calls. No waiting. 100% automated.</p>
        </div>

{/* Why Brands Love It Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-semibold text-foreground text-center mb-8">Why Brands Love It</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-muted-foreground">Fast Delivery – Ready in 30 minutes</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-muted-foreground">Voice + Script + Music included</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-muted-foreground">Great for Reels, Ads & Product Launches</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-muted-foreground">Affordable at just ₹600 per video</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-muted-foreground">No design skills needed — just upload and done</span>
            </div>
          </div>
        </div>
        {/* Powered By Section */}
        <div className="text-center mb-16">
          <p className="text-muted-foreground text-sm mb-6">Powered by</p>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <div className="flex items-center space-x-3">
              <img
                src="/lovable-uploads/a0d067e3-31c4-4460-9f9b-7c01de698cb0.png"
                alt="Kling AI Logo"
                className="h-6 w-auto"
              />
              <span className="text-muted-foreground">Kling AI</span>
            </div>
            <div className="flex items-center space-x-3">
              <img
                src="/lovable-uploads/4fef3d5e-6027-4434-ac33-efd08f0819df.png"
                alt="Eleven Labs Logo"
                className="h-6 w-auto"
              />
              <span className="text-muted-foreground">Eleven Labs</span>
            </div>
            <div className="flex items-center space-x-3">
              <img
                src="/lovable-uploads/76ac2028-1545-407e-b33f-378f4dd531a1.png"
                alt="ChatGPT-4o Logo"
                className="h-6 w-auto"
              />
              <span className="text-muted-foreground">ChatGPT-4o</span>
            </div>
          </div>
        </div>

        {/* Sample Section */}
        <div className="text-center mb-16">
          <h2 className="text-2xl text-foreground mb-4">Want to see examples?</h2>
          <Button
            onClick={() => {
              const element = document.getElementById('video-showcase');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            variant="outline"
            className="text-primary border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Play className="mr-2 h-4 w-4" /> Watch Demo Videos
          </Button>
        </div>

        {/* Video Showcase */}
        <div id="video-showcase" className="w-full max-w-[1400px] mx-auto relative z-10 scroll-mt-16"> {/* Added id and scroll-mt */}
          <VideoShowcase />
        </div>
{/* Final CTA Section */}
        <div className="text-center mt-24 mb-12"> {/* Added margin top */}
          <h2 className="text-3xl font-semibold text-foreground mb-4">Ready to get your AI video?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Upload your product and receive your video in minutes.
          </p>
          <Button
            onClick={() => navigate("/auth/signup")}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
          >
            <RocketIcon className="mr-2 h-5 w-5" /> Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
