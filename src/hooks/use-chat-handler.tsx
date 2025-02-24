
import { useState } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChatHandler(messages: Message[], setInput: (value: string) => void) {
  const handleSubmit = (e: React.FormEvent, input: string) => {
    e.preventDefault();
    if (input.trim() === "") return;

    const userMessage: Message = { role: "user", content: input };
    messages.push(userMessage);

    setInput("");

    const assistantMessage: Message = { role: "assistant", content: "Loading..." };
    messages.push(assistantMessage);

    fetch("/api/ai-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: messages }),
    })
      .then((response) => response.json())
      .then((data) => {
        assistantMessage.content = data.content;
      })
      .catch((error) => {
        console.error("Error:", error);
        assistantMessage.content = "Sorry, I encountered an error. Please try again.";
      });
  };

  return { handleSubmit };
}
