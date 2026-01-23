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
    <div className="relative group my-4 rounded-xl overflow-hidden border border-border/50">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={copyToClipboard}
          className="px-3 py-1.5 bg-secondary/80 hover:bg-secondary text-foreground border border-border rounded-lg text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5"
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
        className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-lovable dark:shadow-lovable-dark ${isUser
            ? "bg-gold-500 text-white"
            : "bg-card text-foreground border border-border"}`}
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

  if (messages.length === 0 && chatMode === "plan") {
    const templates = repoName
      ? [
          {
            title: "\ud83c\udfaf Plan & Implement Feature",
            description: "Strategic planning + clean execution",
            icon: "\ud83d\udccb",
            prompt: `I need help adding a new feature to ${repoName}. First, create a detailed plan breaking down: (1) required files/components, (2) architecture decisions, (3) step-by-step implementation approach, (4) testing strategy. Then execute the plan methodically, implementing each piece with clean, production-ready code.`,
          },
          {
            title: "\ud83d\udd0d Audit & Optimize",
            description: "Deep analysis + performance fixes",
            icon: "\u26a1",
            prompt: `Perform a comprehensive audit of ${repoName}: (1) identify performance bottlenecks and UX issues, (2) create a prioritized improvement list with impact estimates, (3) implement the top 3 highest-impact fixes with detailed explanations of the changes.`,
          },
          {
            title: "\ud83c\udfd7\ufe0f Refactor Architecture",
            description: "Code quality + maintainability upgrade",
            icon: "\ud83d\udd28",
            prompt: `Help me refactor ${repoName} for better architecture: (1) analyze current structure and identify pain points, (2) propose a better organization with rationale, (3) create a migration plan, (4) refactor the most critical components while maintaining functionality.`,
          },
          {
            title: "\ud83d\udc1b Debug & Fix",
            description: "Root cause analysis + solution",
            icon: "\ud83d\udd27",
            prompt: `I'm experiencing an issue in ${repoName}. Help me: (1) investigate and identify the root cause, (2) explain why it's happening, (3) propose 2-3 solution approaches with pros/cons, (4) implement the best solution with proper error handling and tests.`,
          },
          {
            title: "\ud83d\udcf1 Mobile Responsive",
            description: "Cross-device perfection",
            icon: "\ud83d\udcd0",
            prompt: `Make ${repoName} fully mobile-responsive: (1) audit all layouts for mobile issues, (2) fix overflow, touch targets, and spacing, (3) ensure smooth interactions on all screen sizes, (4) test key user flows on mobile.`,
          },
          {
            title: "\ud83d\ude80 Production Prep",
            description: "Deploy-ready checklist",
            icon: "\u2705",
            prompt: `Prepare ${repoName} for production: (1) verify all environment variables and configs, (2) add proper error boundaries and loading states, (3) optimize bundle size and performance, (4) ensure security best practices, (5) create deployment documentation.`,
          },
        ]
      : [
          {
            title: "\ud83d\udcbc Full-Stack SaaS",
            description: "Complete modern web app",
            icon: "\ud83c\udf10",
            prompt: "Build a complete SaaS application with: (1) beautiful landing page with hero, features, pricing, (2) authentication system, (3) main dashboard with key features, (4) responsive design, (5) database schema, (6) API routes. Plan the architecture first, then implement step-by-step.",
          },
          {
            title: "\ud83c\udfa8 Portfolio Showcase",
            description: "Stunning personal brand",
            icon: "\u2728",
            prompt: "Create an impressive portfolio website: (1) eye-catching hero section with smooth animations, (2) project showcase with filtering, (3) about section with timeline, (4) contact form, (5) blog section, (6) dark mode toggle. Use modern design trends and micro-interactions.",
          },
          {
            title: "\ud83d\udcca Analytics Dashboard",
            description: "Data visualization powerhouse",
            icon: "\ud83d\udcc8",
            prompt: "Build a comprehensive analytics dashboard: (1) sidebar navigation with sections, (2) overview page with key metrics cards, (3) interactive charts (line, bar, pie), (4) data tables with sorting/filtering, (5) responsive layout, (6) real-time data updates. Plan the component hierarchy first.",
          },
          {
            title: "\ud83d\uded2 E-commerce Store",
            description: "Full shopping experience",
            icon: "\ud83d\uded2",
            prompt: "Create a modern e-commerce platform: (1) product catalog with filters, (2) product detail pages, (3) shopping cart with persistence, (4) checkout flow, (5) order management, (6) search functionality. Design the database schema and API structure first.",
          },
          {
            title: "\ud83d\udcdd Content Platform",
            description: "Blog or publishing system",
            icon: "\u270d\ufe0f",
            prompt: "Build a content management platform: (1) rich text editor for posts, (2) category/tag system, (3) user authentication, (4) comment system, (5) search and filtering, (6) responsive reading experience. Plan the content model and user flows first.",
          },
          {
            title: "\ud83c\udfae Interactive Experience",
            description: "Creative web application",
            icon: "\ud83c\udfaf",
            prompt: "Create an engaging interactive web experience: (1) unique landing concept, (2) smooth animations and transitions, (3) user interaction flows, (4) creative UI elements, (5) responsive design, (6) performance optimization. Start with wireframes and interaction design.",
          },
        ];

    return (
      <div className="relative z-0 flex flex-col items-center justify-center h-full px-4 py-6 overflow-y-auto">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {templates.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => onTemplateSelect?.(template.prompt)}
                className="group relative px-4 py-4 text-left rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-gold-500/50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!onTemplateSelect}
                title={template.prompt}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl flex-shrink-0">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-surface-900 dark:text-surface-100 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                      {template.title}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed pl-11">
                  {template.description}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>
            ))}
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