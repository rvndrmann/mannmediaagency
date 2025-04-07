import {
  AIConfigRuntime,
  InferenceOptions,
  ModelParserRegistry,
  Output,
  JSONObject,
  AIConfig,
  ExecuteResult // Re-importing as it might be needed for casting
} from "aiconfig";
import { OrchestratorAgentConfig, getOrchestratorTools } from "./orchestrator";
import { GreetingAgentConfig } from "./greeting";
import { trace, SpanStatusCode } from "@opentelemetry/api"; // Import SpanStatusCode

// Define the structure for the run result
interface AgentRunResult {
  output: string | JSONObject | null; // Can be text or structured data
}

// --- Model Parser Setup ---
// You MUST register the model parsers you intend to use.
// This should ideally happen once during application setup.
const modelParsers = new ModelParserRegistry();
// Example: Register OpenAI parser if used
// import { OpenAIParser } from "aiconfig/dist/parsers/openai"; // Adjust path if needed
// modelParsers.register(new OpenAIParser());
// Ensure the parser for 'openai:gpt-4o' and 'openai:gpt-3.5-turbo' is registered.


// --- Runtime Initialization ---
// Create runtime instances for each config.
// These could be singletons or created as needed.
// IMPORTANT: The model parsers are typically passed during execution (run).
// Try passing the serialized config string to the constructor
const greetingRuntime = new AIConfigRuntime(JSON.stringify(GreetingAgentConfig));
const orchestratorRuntime = new AIConfigRuntime(JSON.stringify(OrchestratorAgentConfig));

// Add tools to the orchestrator's runtime
const tools = getOrchestratorTools(orchestratorRuntime, greetingRuntime);
orchestratorRuntime.registerTools(tools);


// --- Main Execution Function ---
export async function runOrchestrator(
  userInput: string,
  options?: InferenceOptions // Optional inference options
): Promise<AgentRunResult> {
  const tracer = trace.getTracer("aiconfig-orchestrator-runner");

  return await tracer.startActiveSpan("MultiAgentWorkflow", async (span) => {
    try {
      console.log("Starting MultiAgentWorkflow trace span...");
      span.setAttribute("user.input", userInput);

      // Prepare the parameters for the orchestrator prompt
      const params: JSONObject = {
        user_input: userInput, // Pass user input to the named parameter
      };

      console.log(`Running OrchestratorAgent with input:`, params);

      // Execute the orchestrator's main prompt using its runtime
      const outputs: Output[] | null = await orchestratorRuntime.run(
        "orchestrate_request", // Name of the prompt in the config
        params,
        { // Pass options, including the model parser registry
          ...(options || {}), // Spread existing options
          model_parser_registry: modelParsers // Pass the required parsers
        }
        // Note: Streaming is handled by options if needed { stream: true }
      );

      console.log("OrchestratorAgent run completed. Outputs:", outputs);
      span.addEvent("Orchestrator run completed");

      // Process the output
      let finalOutput: string | JSONObject | null = null;
      if (outputs && outputs.length > 0) {
          const firstOutput = outputs[0];
          // Check output type and process accordingly
          if (firstOutput.output_type === "execute_result") {
              const executeResult = firstOutput as ExecuteResult; // Cast to ExecuteResult
              if (typeof executeResult.data === 'string') {
                  finalOutput = executeResult.data;
              } else if (executeResult.data && typeof (executeResult.data as any).value === 'string') {
                  finalOutput = (executeResult.data as any).value;
              } else if (executeResult.data && typeof (executeResult.data as any).content === 'string') {
                  finalOutput = (executeResult.data as any).content;
              } else {
                  // Convert non-string/object data to string for finalOutput
                  if (typeof executeResult.data === 'object' && executeResult.data !== null) {
                      finalOutput = executeResult.data as JSONObject; // Assign if it's already an object
                  } else {
                      finalOutput = JSON.stringify(executeResult.data); // Stringify other types (number, boolean, null, etc.)
                  }
              }
          } else if (firstOutput.output_type === 'error') {
              const errorResult = firstOutput as any; // Use any if Error type is not exported/known
              console.error("Orchestrator execution error:", errorResult.ename, errorResult.evalue);
              span.recordException(new Error(`${errorResult.ename}: ${errorResult.evalue}`));
              span.setStatus({ code: SpanStatusCode.ERROR, message: errorResult.ename || 'Agent Execution Error' });
              finalOutput = `Error: ${errorResult.evalue}`;
          } else {
              // Safely handle unknown output types
              const unknownOutput = firstOutput as any;
              const outputType = unknownOutput.output_type ?? 'unknown';
              console.warn("Unhandled output type:", outputType, unknownOutput);
              finalOutput = `Unhandled output type: ${outputType}`;
          }
      } else {
          finalOutput = "Orchestrator did not produce any output.";
          span.addEvent("Orchestrator produced no output");
      }

      span.setAttribute("agent.output.type", typeof finalOutput);
      if (typeof finalOutput === 'string') {
        span.setAttribute("agent.output.content_preview", finalOutput.substring(0, 100)); // Log preview
      }
      span.end();
      console.log("MultiAgentWorkflow trace span ended.");

      return { output: finalOutput };

    } catch (error) {
      console.error("Error running orchestrator agent:", error);
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.end();
      console.log("MultiAgentWorkflow trace span ended with error.");
      throw error; // Re-throw the error
    }
  });
}

// Example Usage (optional, for testing/demonstration)
/*
async function testRun() {
  // Ensure model parsers are registered before running
  if (modelParsers.getRegistry().size === 0) {
     console.warn("No model parsers registered! Register parsers (e.g., OpenAI) before running.");
     // Add registration here if needed for standalone testing
     // import { OpenAIParser } from "aiconfig/dist/parsers/openai";
     // modelParsers.register(new OpenAIParser());
     // console.log("Registered OpenAI parser for testing.");
  }

  try {
    console.log("Testing orchestrator run...");
    const result = await runOrchestrator("Hello there!");
    console.log("Orchestrator Result:", result);

    // Test a non-greeting input
    // const result2 = await runOrchestrator("Can you write code?");
    // console.log("Orchestrator Result 2:", result2);

  } catch (e) {
    console.error("Test run failed:", e);
  }
}

// testRun(); // Uncomment to run test
*/