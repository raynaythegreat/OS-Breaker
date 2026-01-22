"use client";

import { useRef, useEffect, useState, type RefObject } from "react";
import Image from "next/image";

interface ChatInputAttachment {
  id: string;
  name: string;
  kind: "image" | "file";
  size: number;
  previewUrl?: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement>;
  attachments: ChatInputAttachment[];
  onFilesSelected: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  onOpenImageGenerator?: () => void;
  canGenerateImages?: boolean;
  attachmentError?: string | null;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  textareaRef: externalTextareaRef,
  attachments,
  onFilesSelected,
  onRemoveAttachment,
  onOpenImageGenerator,
  canGenerateImages = true,
  attachmentError,
  disabled,
  loading,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? fallbackTextareaRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentButtonRef = useRef<HTMLButtonElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value, textareaRef]);

  useEffect(() => {
    if (!showAttachmentMenu) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        attachmentMenuRef.current?.contains(target) ||
        attachmentButtonRef.current?.contains(target)
      ) {
        return;
      }
      setShowAttachmentMenu(false);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [showAttachmentMenu]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (loading) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const showStop = Boolean(loading);

  return (
    <div className="bg-background px-3 py-6 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 max-w-full rounded-xl border border-border bg-secondary/50 px-2 py-1.5 backdrop-blur-sm"
              >
                {attachment.kind === "image" && attachment.previewUrl ? (
                  <Image
                    src={attachment.previewUrl}
                    alt={attachment.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 11.625h4.5m-4.5 2.25h4.5m2.25-9H5.625c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                )}

                <div className="min-w-0 px-1">
                  <div className="text-[11px] font-bold text-foreground truncate max-w-[12rem]">
                    {attachment.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {attachment.kind === "image" ? "Image" : "File"} • {(attachment.size / 1024).toFixed(0)} KB
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="ml-1 w-6 h-6 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Remove ${attachment.name}`}
                  disabled={disabled}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {attachmentError && (
          <div className="mb-3 px-2 text-xs font-bold text-red-500 uppercase tracking-wider">
            {attachmentError}
          </div>
        )}

        <div
          className="flex items-end gap-2 bg-surface-100 dark:bg-surface-900 rounded-xl border border-border p-1.5 focus-within:border-gold-500/50 focus-within:ring-2 focus-within:ring-gold-500/20 transition-all duration-300 shadow-lovable dark:shadow-lovable-dark"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!e.dataTransfer.files?.length) return;
            onFilesSelected(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (!e.target.files?.length) return;
              onFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />

          <div className="relative">
            <button
              ref={attachmentButtonRef}
              type="button"
              onClick={() => {
                if (disabled) return;
                setShowAttachmentMenu((prev) => !prev);
              }}
              disabled={disabled}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-50 dark:bg-surface-800 border border-border text-muted-foreground hover:text-foreground hover:border-gold-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center group"
              aria-label="Attach"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.956 7.956a3.375 3.375 0 01-4.773-4.773l9.348-9.348a2.25 2.25 0 113.182 3.182l-9.349 9.349a1.125 1.125 0 01-1.591-1.591l7.956-7.956" />
              </svg>
            </button>
            {showAttachmentMenu && (
              <div
                ref={attachmentMenuRef}
                className="absolute bottom-full left-0 mb-3 w-56 rounded-xl border border-gold-500/20 bg-surface-50 dark:bg-surface-950 shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-200"
                role="menu"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg transition-colors"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Upload files
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    onOpenImageGenerator?.();
                  }}
                  disabled={!canGenerateImages || !onOpenImageGenerator}
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l1.29 1.29m-12.125-12.125H3.75A2.25 2.25 0 001.5 4.5v15a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25V4.5A2.25 2.25 0 0019.5 2.25h-15zM9 10.125a1.125 1.125 0 11-2.25 0 1.125 1.125 0 012.25 0z" />
                  </svg>
                  Generate image
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={Boolean(disabled && !loading)}
            rows={1}
            className="flex-1 bg-transparent text-base md:text-sm text-foreground placeholder-muted-foreground/60 resize-none focus:outline-none px-3 py-2.5 max-h-[200px] leading-relaxed"
          />

          {showStop ? (
            <button
              type="button"
              onClick={onStop}
              disabled={!onStop}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300"
              aria-label="Stop"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={disabled || (!value.trim() && attachments.length === 0)}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center text-white disabled:opacity-20 disabled:grayscale hover:bg-gold-600 transition-all duration-300 shadow-lg shadow-gold-500/20 active:scale-95 group"
              aria-label="Send"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest text-center mt-4">
          Professional AI Command Center • OS Athena v1.1.0
        </p>
      </div>
    </div>
  );
}