
import React from 'react';
import { GalleryPanel, GalleryPanelProps } from './GalleryPanel';

// Adapter component to handle mismatched props between ProductShot page and GalleryPanel component
export const GalleryPanelAdapter: React.FC<{
  generatedImages: any[];
  savedImages: any[];
  defaultImages: any[];
  onSaveImage: (imageId: string) => Promise<any>;
  onSetAsDefault: (imageId: string) => Promise<any>;
}> = (props) => {
  // Map the received props to what GalleryPanel expects
  const adaptedProps: GalleryPanelProps = {
    images: [...props.generatedImages, ...props.savedImages],
    defaultImages: props.defaultImages,
    onSave: props.onSaveImage,
    onSetDefault: props.onSetAsDefault
  };

  return <GalleryPanel {...adaptedProps} />;
};
