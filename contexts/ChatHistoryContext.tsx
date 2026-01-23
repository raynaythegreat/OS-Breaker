"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

export interface ChatAttachment {
  id: string;
  name: string;
  kind: "image" | "file";
  mimeType: string;
  size: number;
  previewUrl?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  deviceToken?: string | null;
  provider?:
    | "claude"
    | "openai"
    | "groq"
    | "openrouter"
    | "ollama"
    | "gemini"
    | "opencodezen"
    | "fireworks"
    | "mistral"
    | "cohere"
    | "perplexity"
    | "zai";
  model?: string;
  repoName?: string | null;
  repoFullName?: string | null;
  chatMode?: "plan" | "build";
}

interface CreateSessionOptions {
  repoName?: string | null;
  repoFullName?: string | null;
  messages?: ChatMessage[];
  model?: string;
  provider?: ChatSession["provider"];
  deviceToken?: string | null;
  chatMode?: "plan" | "build";
}

interface ChatHistoryContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  deviceToken: string | null;
  createNewSession: (options?: CreateSessionOptions) => string;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateCurrentSession: (
    messages: ChatMessage[],
    metadata?: Partial<ChatSession>,
    sessionId?: string,
  ) => void;
  clearCurrentSession: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "athena-chat-history";
const MAX_SESSIONS = 50;

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateTitle(
  messages: ChatMessage[],
  repoName?: string | null,
): string {
  if (repoName) return repoName;
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    return (
      firstUserMessage.content.slice(0, 50) +
      (firstUserMessage.content.length > 50 ? "..." : "")
    );
  }
  return "New Chat";
}

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const storedToken = localStorage.getItem("athena-device-token");
      if (storedToken) {
        setDeviceToken(storedToken);
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const normalized = storedToken
            ? parsed
                .filter(
                  (session) =>
                    !session.deviceToken ||
                    session.deviceToken === storedToken,
                )
                .map((session) =>
                  session.deviceToken
                    ? session
                    : { ...session, deviceToken: storedToken },
                )
            : parsed;
          setSessions(normalized.slice(0, MAX_SESSIONS));
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !deviceToken) return;
    setSessions((prev) =>
      prev.map((session) =>
        session.deviceToken ? session : { ...session, deviceToken },
      ),
    );
  }, [deviceToken, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(sessions.slice(0, MAX_SESSIONS)),
      );
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [sessions, mounted]);

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || null;

  const createNewSession = useCallback(
    (options: CreateSessionOptions = {}): string => {
      const {
        repoName = null,
        repoFullName = null,
        messages = [],
        model,
        provider,
        deviceToken: sessionDeviceToken = deviceToken ?? null,
        chatMode = "plan",
      } = options;
      const newId = generateId();
      const newSession: ChatSession = {
        id: newId,
        title: generateTitle(messages, repoName),
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        repoName,
        repoFullName,
        model,
        provider,
        deviceToken: sessionDeviceToken,
        chatMode,
      };
      setSessions((prev) => [newSession, ...prev].slice(0, MAX_SESSIONS));
      setCurrentSessionId(newId);
      return newId;
    },
    [deviceToken],
  );

  const loadSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    },
    [currentSessionId],
  );

  const updateCurrentSession = useCallback(
    (
      messages: ChatMessage[],
      metadata?: Partial<ChatSession>,
      sessionId?: string,
    ) => {
      const targetId = sessionId ?? currentSessionId;
      if (!targetId) return;
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === targetId);
        if (!existing) return prev;
        const updatedSession = {
          ...existing,
          ...metadata,
          messages,
          title: generateTitle(
            messages,
            metadata?.repoName ?? existing.repoName,
          ),
          updatedAt: Date.now(),
          deviceToken:
            metadata?.deviceToken ?? existing.deviceToken ?? deviceToken ?? null,
        };
        const remaining = prev.filter((s) => s.id !== targetId);
        return [updatedSession, ...remaining].slice(0, MAX_SESSIONS);
      });
    },
    [currentSessionId],
  );

  const clearCurrentSession = useCallback(() => {
    setCurrentSessionId(null);
  }, []);

  return (
    <ChatHistoryContext.Provider
      value={{
        sessions,
        currentSessionId,
        currentSession,
        deviceToken,
        createNewSession,
        loadSession,
        deleteSession,
        updateCurrentSession,
        clearCurrentSession,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return context;
}
