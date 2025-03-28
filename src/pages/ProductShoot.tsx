
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { InputPanel } from '@/components/product-shoot/InputPanel';
import { GalleryPanel } from '@/components/product-shoot/GalleryPanel';
import { MobilePanelToggle } from '@/components/product-shoot/MobilePanelToggle';
import { useMediaQuery } from '@/hooks/use-media-query';
import { DefaultImagesGrid } from '@/components/product-shoot/DefaultImagesGrid';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileUp } from 'lucide-react';

interface GeneratedImage {
  id: string;
  prompt: string;
  result_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function ProductShoot() {
  const [activeTab, setActiveTab] = useState<'saved' | 'default'>('saved');
  const [activePanel, setActivePanel] = useState<'input' | 'gallery'>('input');
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<GeneratedImage[] | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Map the database status values to the UI status values
      const mappedImages = data.map(item => ({
        id: item.id,
        prompt: item.prompt,
        result_url: item.result_url,
        status: mapDbStatusToUiStatus(item.status)
      }));
      
      setImages(mappedImages);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Failed to fetch images');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to map database status to UI status
  const mapDbStatusToUiStatus = (dbStatus: string): 'pending' | 'processing' | 'completed' | 'failed' => {
    switch(dbStatus) {
      case 'in_queue': return 'processing';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'pending';
    }
  };

  const handleImageGenerated = () => {
    fetchImages();
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  // Handle selecting an image from the DefaultImagesGrid
  const handleSelectDefaultImage = (imageUrl: string) => {
    toast.info("Selected image from defaults");
    // Implement handling of selected image if needed
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col md:flex-row h-full">
        {/* Mobile Panel Toggle */}
        {isMobile && (
          <MobilePanelToggle 
            activePanel={activePanel} 
            setActivePanel={setActivePanel} 
          />
        )}
        
        {/* Input Panel (left side) */}
        <div className={`${isMobile && activePanel !== 'input' ? 'hidden' : 'flex flex-col'} md:w-1/3 border-r border-[#2A2A2A] h-full`}>
          <InputPanel 
            onGenerate={handleImageGenerated} 
            isMobile={isMobile}
            // Add default values for required props
            prompt=""
            previewUrl={null}
            imageSize="768x768"
            inferenceSteps={30}
            guidanceScale={7.5}
            outputFormat="PNG"
            creditsRemaining={0}
            isGenerating={false}
            onPromptChange={() => {}}
            onFileSelect={() => {}}
            onClearFile={() => {}}
            onImageSizeChange={() => {}}
            onInferenceStepsChange={() => {}}
            onGuidanceScaleChange={() => {}}
            onOutputFormatChange={() => {}}
            messages={[]}
          />
        </div>
        
        {/* Gallery/Output Panel (right side) */}
        <div className={`${isMobile && activePanel !== 'gallery' ? 'hidden' : 'flex flex-col'} md:flex-1 h-full`}>
          {/* Tab Navigation */}
          <div className="border-b border-[#2A2A2A]">
            <div className="flex">
              <button
                className={`px-4 py-3 text-sm font-medium ${activeTab === 'saved' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('saved')}
              >
                Your Generations
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium ${activeTab === 'default' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('default')}
              >
                Community Images
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'saved' ? (
              <GalleryPanel 
                isMobile={isMobile}
                images={images}
                isLoading={isLoading}
                onDownload={handleDownload}
              />
            ) : (
              <div className="h-full">
                <div className="h-full flex flex-col">
                  {/* Default Images Header */}
                  <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
                    <h2 className="text-gray-300 font-medium">Community Images</h2>
                    <Button variant="outline" size="sm" className="text-xs">
                      <FileUp className="h-3 w-3 mr-1" /> 
                      Share Yours
                    </Button>
                  </div>
                  
                  {/* Default Images Content */}
                  <div className="flex-1 overflow-auto">
                    <DefaultImagesGrid onSelect={handleSelectDefaultImage} />
                  </div>
                  
                  {/* More Default Images Link */}
                  <div className="p-4 border-t border-[#2A2A2A]">
                    <Button variant="link" className="text-xs text-purple-400 w-full">
                      View More Images <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
