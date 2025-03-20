import { v4 as uuidv4 } from 'uuid';
import { Tool } from "@/hooks/multi-agent/types";

export const productShotV2Tool: Tool = {
  name: "product-shot-v2",
  description: `This tool generates an enhanced product image based on a detailed product description.
  It requires a product description and returns a URL to the generated image.`,
  parameters: {
    type: "object",
    properties: {
      productDescription: {
        type: "string",
        description: "A detailed description of the product for which to generate an image."
      },
      requestId: {
        type: "string",
        description: "Unique identifier for the request (UUID)."
      }
    },
    required: ["productDescription"]
  },
  async execute(args, runId) {
    const { productDescription } = args;
    const requestId = uuidv4();

    // Construct the message to send to the assistant
    const promptMessage = `
    Generate an enhanced, visually appealing product image based on the following description:
    ${productDescription}
    
    Instructions:
    - Focus on creating a high-quality, photorealistic image.
    - Ensure the product is the central focus and is visually striking.
    - Pay attention to detail to accurately represent the product.
    - Use professional photography techniques to enhance the image.
    - Ensure the image is suitable for marketing and promotional purposes.
    `;

    // Return the tool's instructions and the initial message
    return {
      content: `Initializing enhanced product image generation...`,
      metadata: { requestId: requestId },
    };
  }
};
