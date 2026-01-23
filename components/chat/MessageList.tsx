"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChatMessage } from "@/contexts/ChatHistoryContext";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  repoName?: string | null;
  onTemplateSelect?: (prompt: string) => void;
  chatMode?: "plan" | "build";
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const CodeBlock = memo(function CodeBlock({
  code,
  language
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-gold-500/20 hover:shadow-lg transition-shadow duration-200">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={copyToClipboard}
          className="px-3 py-1.5 bg-secondary/80 hover:bg-secondary text-foreground border border-gold-500/20 hover:border-gold-500/40 rounded-lg text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5"
          title="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark as any}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: "0",
          padding: "1.25rem",
          paddingTop: "2.5rem",
          fontSize: "0.85rem",
          lineHeight: "1.6",
          background: "#0d0d0d",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const timestamp = new Date(message.timestamp || Date.now()).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}
    >
      <div
        className={`max-w-[90%] sm:max-w-[75%] rounded-xl px-5 py-4 shadow-lg ${isUser
            ? "bg-gradient-to-br from-gold-500 to-amber-500 text-white rounded-br-md"
            : "bg-gradient-to-br from-card to-surface-100 dark:to-surface-900 text-foreground border border-gold-500/10 rounded-bl-md"}`}
      >
        {isUser ? (
          <div className="space-y-2">
            {message.content ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : null}
            {message.attachments && message.attachments.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="rounded-xl bg-black/10 border border-white/10 overflow-hidden"
                  >
                    {attachment.kind === "image" && attachment.previewUrl ? (
                      <a
                        href={attachment.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative h-32"
                      >
                        <Image
                          src={attachment.previewUrl}
                          alt={attachment.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </a>
                    ) : (
                      <div className="h-20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 11.625h4.5m-4.5 2.25h4.5m2.25-9H5.625c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    )}
                    <div className="px-2 py-1.5 text-[10px] text-white/90 font-medium truncate bg-black/20">
                      {attachment.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isBlock = Boolean(match);
                    return isBlock ? (
                      <CodeBlock
                        code={String(children).replace(/\n$/, "")}
                        language={match ? match[1] : undefined}
                      />
                    ) : (
                      <code className="bg-secondary px-1.5 py-0.5 rounded-md text-[0.9em] font-mono text-foreground font-medium" {...(props as any)}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content || ""}
              </ReactMarkdown>
            </div>
            <div className="text-[10px] text-muted-foreground/60 font-medium">
              {timestamp}
            </div>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-secondary/50 text-[11px] font-medium"
                  >
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 11.625h4.5m-4.5 2.25h4.5m2.25-9H5.625c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div className="min-w-0">
                      <div className="text-foreground truncate uppercase tracking-wider text-[10px]">{attachment.name}</div>
                      <div className="text-muted-foreground/70">
                        {attachment.kind === "image" ? "Image" : "File"} • {formatBytes(attachment.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-4 justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-card text-foreground border border-border shadow-lovable dark:shadow-lovable-dark">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-xs text-muted-foreground font-medium">AI is thinking...</span>
        </div>
      </div>
    </div>
  );
});

export default function MessageList({
  messages,
  isLoading,
  repoName = null,
  onTemplateSelect,
  chatMode = "build",
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
        {/* Quote */}
        <div className="max-w-2xl mb-8">
          <blockquote className="text-2xl md:text-3xl font-display font-semibold text-foreground leading-relaxed mb-4">
            &ldquo;Wisdom begins in wonder.&rdquo;
          </blockquote>
          <p className="text-sm font-medium text-gold-600 dark:text-gold-400 uppercase tracking-widest">
            — Athena
          </p>
        </div>
        
        {/* Instructions */}
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-600 dark:text-gold-400">1</span>
            </div>
            <span>Select a model from the dropdown above</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-600 dark:text-gold-400">2</span>
            </div>
            <span>Optionally select a repository for context</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-600 dark:text-gold-400">3</span>
            </div>
            <span>Type your message or add files to begin</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 h-full overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 bg-surface-50 dark:bg-black">
      <div className="max-w-5xl mx-auto space-y-8">
        {messages.map((message, index) => (
          <MessageBubble key={message.timestamp ?? index} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}