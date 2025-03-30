
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates initial scenes for new canvas projects
 */
export function generateInitialScenes() {
  return [
    {
      id: uuidv4(),
      title: "Introduction",
      description: "Opening scene that sets the context for the video",
      script: "Welcome to our product showcase. In this video, we'll explore the key features and benefits.",
      imagePrompt: "A professional, clean introduction screen with soft lighting and minimal design",
      order: 1
    },
    {
      id: uuidv4(),
      title: "Feature Highlight",
      description: "Showcase the main product features",
      script: "Our product offers several innovative features designed to enhance your experience.",
      imagePrompt: "Close-up of the product with key features highlighted with clean graphical elements",
      order: 2
    },
    {
      id: uuidv4(),
      title: "Conclusion",
      description: "Wrap up with call to action",
      script: "Thanks for watching our showcase. Visit our website to learn more and place your order today.",
      imagePrompt: "Elegant closing screen with product logo and clean call to action text overlay",
      order: 3
    }
  ];
}
