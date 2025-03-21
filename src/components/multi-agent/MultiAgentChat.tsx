
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { MessageList } from "./MessageList";
import { InputForm } from "./InputForm";
import { MultiAgentChatHeader } from "./MultiAgentChatHeader";
import { Attachment } from "@/types/message";
import { MultiAgentChatFooter } from "./MultiAgentChatFooter";

export const MultiAgentChat = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    activeAgent,
    pendingAttachments,
    userCredits,
    usePerformanceModel,
    enableDirectToolExecution,
    tracingEnabled,
    debugMode,
    handleSubmit,
    switchAgent,
    clearChat,
    addAttachments,
    removeAttachment,
    togglePerformanceMode,
    toggleDirectToolExecution,
    toggleTracing,
    toggleDebugMode
  } = useMultiAgentChat();

  const handleFileDrop = (acceptedFiles: File[]) => {
    // Process files
    acceptedFiles.forEach(async (file) => {
      if (file.type.startsWith("image/")) {
        // Create Object URL for immediate display
        const objectUrl = URL.createObjectURL(file);
        
        const newAttachment: Attachment = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: "image",
          url: objectUrl,
          name: file.name,
          size: file.size,
          contentType: file.type
        };
        
        addAttachments([newAttachment]);
      }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F141E]">
      <MultiAgentChatHeader
        activeAgent={activeAgent}
        onSwitchAgent={switchAgent}
        onClearChat={clearChat}
        usePerformanceModel={usePerformanceModel}
        onTogglePerformanceMode={togglePerformanceMode}
        enableDirectToolExecution={enableDirectToolExecution}
        onToggleDirectToolExecution={toggleDirectToolExecution}
        tracingEnabled={tracingEnabled}
        onToggleTracing={toggleTracing}
        debugMode={debugMode}
        onToggleDebugMode={toggleDebugMode}
      />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <MessageList 
          messages={messages} 
          activeAgent={activeAgent}
          onFileUpload={handleFileDrop}
        />
        
        <InputForm
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          pendingAttachments={pendingAttachments}
          onRemoveAttachment={removeAttachment}
          onFileUpload={handleFileDrop}
          hasEnoughCredits={!!userCredits && userCredits.credits_remaining >= 0.07}
        />
      </div>
      
      <MultiAgentChatFooter 
        activeAgent={activeAgent}
        creditsRemaining={userCredits?.credits_remaining}
      />
    </div>
  );
};
