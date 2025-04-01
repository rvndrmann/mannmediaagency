
import React from 'react';
import GalleryPanel from './GalleryPanel';
import { GeneratedImage } from '@/types/product-shoot';

// Adapter component to handle mismatched props between ProductShot page and GalleryPanel component
export const GalleryPanelAdapter: React.FC<{
  generatedImages: GeneratedImage[];
  savedImages: GeneratedImage[];
  defaultImages: GeneratedImage[];
  onSaveImage: (imageId: string) => Promise<any>;
  onSetAsDefault: (imageId: string) => Promise<any>;
}> = (props) => {
  // Define the GalleryPanel component props interface
  interface GalleryPanelProps {
    generatedImages: GeneratedImage[];
    savedImages: GeneratedImage[];
    defaultImages: GeneratedImage[];
    onSaveImage: (imageId: string) => Promise<any>;
    onSetAsDefault: (imageId: string) => Promise<any>;
  }

  // Map the received props directly (no adaptation needed in this case)
  const adaptedProps: GalleryPanelProps = {
    generatedImages: props.generatedImages,
    savedImages: props.savedImages,
    defaultImages: props.defaultImages,
    onSaveImage: props.onSaveImage,
    onSetAsDefault: props.onSetAsDefault
  };

  return <GalleryPanel {...adaptedProps} />;
};
