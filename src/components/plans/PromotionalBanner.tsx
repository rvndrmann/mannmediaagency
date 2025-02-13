
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

export const PromotionalBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        <p className="text-sm font-medium">
          Weekend Special: Get 30% OFF with code 'AI' 🎉
        </p>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
