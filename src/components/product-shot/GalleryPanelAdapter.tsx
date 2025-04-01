
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
  // Map the received props to what GalleryPanel expects
  const adaptedProps = {
    images: [...props.generatedImages, ...props.savedImages],
    defaultImages: props.defaultImages,
    onSave: props.onSaveImage,
    onSetDefault: props.onSetAsDefault
  };

  return <GalleryPanel {...adaptedProps} />;
};
