
import { supabase } from "@/integrations/supabase/client";
import { ToolDefinition, ToolContext, ToolResult } from "@/hooks/types";

export const customVideoTool: ToolDefinition = {
  name: "custom-video",
  description: "Submit a custom video creation request. Describe what you want, and our team will create it for you.",
  parameters: {
    description: {
      type: "string",
      description: "Detailed description of the video you want created"
    },
    references: {
      type: "string",
      description: "Optional references, examples, or inspiration for the video",
      required: false
    },
    creditsAmount: {
      type: "number",
      description: "Number of credits to allocate for this custom video creation (minimum 20)",
      default: 20
    }
  },
  requiredCredits: 20,
  execute: async (params, context: ToolContext): Promise<ToolResult> => {
    try {
      const creditsAmount = params.creditsAmount || 20;
      
      // Ensure minimum credits
      if (creditsAmount < 20) {
        return {
          success: false,
          message: "Custom video creation requires a minimum of 20 credits."
        };
      }
      
      // Check if user has enough credits
      if (context.creditsRemaining < creditsAmount) {
        return {
          success: false,
          message: `Insufficient credits. You need at least ${creditsAmount} credits for this custom video request.`
        };
      }

      // Prepare the remark text combining description and references
      const remarkText = `
Custom Video Request

Description:
${params.description}

${params.references ? `References/Examples:
${params.references}` : ''}

Images attached: ${context.attachments && context.attachments.length > 0 ? 'Yes' : 'No'}
      `.trim();

      // Create the custom order using the RPC function
      const { data: orderData, error: orderError } = await supabase
        .rpc('create_custom_order', {
          remark_text: remarkText,
          credits_amount: creditsAmount
        });

      if (orderError) throw orderError;

      // If there are image attachments, add them to the order
      if (context.attachments && context.attachments.length > 0) {
        for (const attachment of context.attachments) {
          if (attachment.type === 'image') {
            await supabase.rpc('add_custom_order_image', {
              order_id_param: orderData.id,
              image_url_param: attachment.url
            });
          }
        }
      }

      return {
        success: true,
        message: `✅ Your custom video request has been submitted successfully! Our team will review it and start working on it soon. You have allocated ${creditsAmount} credits for this request.`,
        data: {
          orderId: orderData.id,
          status: "pending"
        }
      };
    } catch (error) {
      console.error("Error in custom-video tool:", error);
      return {
        success: false,
        message: error instanceof Error ? `Error: ${error.message}` : "An unknown error occurred"
      };
    }
  }
};
