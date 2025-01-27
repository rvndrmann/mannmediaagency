import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-full border mb-8">
            <Sparkles className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">
              Transform your ideas into videos
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
            Create stunning videos with AI
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate professional videos in minutes using our advanced AI technology. Perfect for creators, marketers, and businesses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button size="lg" className="group">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="lg" className="group">
              Watch Demo
              <Play className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <Card className="p-6 glass-card hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Generate videos in minutes, not hours</p>
          </Card>

          <Card className="p-6 glass-card hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Professional Quality</h3>
            <p className="text-gray-600">High-quality output every time</p>
          </Card>

          <Card className="p-6 glass-card hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Simple Pricing</h3>
            <p className="text-gray-600">Pay only for what you need</p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;