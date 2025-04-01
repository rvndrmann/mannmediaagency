
import React from 'react';
import { InputPanel, InputPanelProps } from './InputPanel';

// This adapter component handles the mismatch between what ProductShot page provides and what InputPanel expects
export const InputPanelAdapter: React.FC<{
  prompt: string;
  onPromptChange: (prompt: string) => void;
  outputFormat: string;
  onOutputFormatChange: (format: string) => void;
  imageWidth: number;
  imageHeight: number;
  onDimensionsChange: (width: any, height: any) => void;
  sourceImageUrl: string;
  onImageUpload: (file: File) => Promise<void>;
  onImageSelect: (url: string) => void;
  defaultImages: any[];
  stylePreset: string;
  onStylePresetChange: (style: string) => void;
  isGenerating: boolean;
  onGenerate: () => any;
}> = (props) => {
  // Map the received props to what InputPanel expects
  const adaptedProps: InputPanelProps = {
    prompt: props.prompt,
    onPromptChange: props.onPromptChange,
    sourceImageUrl: props.sourceImageUrl,
    onImageUpload: props.onImageUpload,
    onImageSelect: props.onImageSelect,
    defaultImages: props.defaultImages,
    stylePreset: props.stylePreset,
    onStylePresetChange: props.onStylePresetChange,
    isLoading: props.isGenerating,
    onSubmit: props.onGenerate
  };

  return <InputPanel {...adaptedProps} />;
};
