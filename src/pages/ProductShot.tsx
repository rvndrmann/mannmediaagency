
import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useProductShoot } from '@/hooks/use-product-shoot';
import { InputPanel } from '@/components/product-shoot/InputPanel';
import { GalleryPanel } from '@/components/product-shoot/GalleryPanel';
import { MobilePanelToggle } from '@/components/product-shoot/MobilePanelToggle';

const ProductShot: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'input' | 'gallery'>('input');
  
  const productShoot = useProductShoot();
  
  return (
    <Layout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        <div className="md:hidden">
          <MobilePanelToggle activePanel={activePanel} setActivePanel={setActivePanel} />
        </div>
        
        <div className={`flex-1 md:w-1/2 md:block ${activePanel === 'input' ? 'block' : 'hidden'}`}>
          <InputPanel 
            prompt={productShoot.settings.prompt}
            onPromptChange={(prompt) => productShoot.setSettings({...productShoot.settings, prompt})}
            outputFormat={productShoot.settings.outputFormat}
            onOutputFormatChange={(format) => productShoot.setSettings({...productShoot.settings, outputFormat: format})}
            imageWidth={productShoot.settings.imageWidth}
            imageHeight={productShoot.settings.imageHeight}
            onDimensionsChange={(width, height) => productShoot.setSettings({...productShoot.settings, imageWidth: width, imageHeight: height})}
            quality={productShoot.settings.quality}
            onQualityChange={(quality) => productShoot.setSettings({...productShoot.settings, quality})}
            seed={productShoot.settings.seed}
            onSeedChange={(seed) => productShoot.setSettings({...productShoot.settings, seed})}
            scale={productShoot.settings.scale}
            onScaleChange={(scale) => productShoot.setSettings({...productShoot.settings, scale})}
            isGenerating={productShoot.isGenerating}
            onGenerate={() => productShoot.generateImage()}
          />
        </div>
        
        <div className={`flex-1 md:w-1/2 md:block ${activePanel === 'gallery' ? 'block' : 'hidden'}`}>
          <GalleryPanel 
            generatedImages={productShoot.generatedImages}
            savedImages={productShoot.savedImages}
            defaultImages={productShoot.defaultImages}
            onSaveImage={productShoot.saveImage}
            onSetAsDefault={productShoot.setAsDefault}
          />
        </div>
      </div>
    </Layout>
  );
};

export default ProductShot;
