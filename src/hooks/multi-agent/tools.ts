
import { productShotV1Tool } from './tools/product-shot-v1-tool';
import { Tool } from './types';

// Map of all available tools
const tools: Record<string, Tool> = {
  "product_shot_v1": productShotV1Tool,
};

export const getTool = (toolName: string): Tool | undefined => {
  return tools[toolName];
};

export { tools };
