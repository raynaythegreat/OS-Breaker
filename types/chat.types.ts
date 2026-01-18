export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export interface ChatRequest {
  messages: Message[];
  provider: "claude" | "openai";
  model: string;
  repoContext?: RepoContext;
  systemPrompt?: string;
}

export interface RepoContext {
  repoFullName: string;
  structure?: string;
  files?: { path: string; content: string }[];
}

export interface StreamChunk {
  type: "text" | "error" | "done";
  content?: string;
  error?: string;
}
