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
    <div className="border-t border-cyan-300/20 bg-black/60 px-3 py-3 sm:px-4 sm:py-4 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 max-w-full rounded-xl border border-cyan-300/20 bg-black/40 px-2 py-1.5"
              >
                {attachment.kind === "image" && attachment.previewUrl ? (
                  <Image
                    src={attachment.previewUrl}
                    alt={attachment.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 rounded-lg object-cover border border-cyan-300/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-black/60 border border-cyan-300/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-cyan-200/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 11.625h4.5m-4.5 2.25h4.5m2.25-9H5.625c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-xs font-medium text-cyan-100 truncate max-w-[14rem]">
                    {attachment.name}
                  </div>
                  <div className="text-[11px] text-cyan-200/60">
                    {attachment.kind === "image" ? "Image" : "File"} • {(attachment.size / 1024).toFixed(0)} KB
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="ml-1 w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-cyan-200/70 hover:text-cyan-100 transition-colors"
                  aria-label={`Remove ${attachment.name}`}
                  disabled={disabled}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {attachmentError && (
          <div className="mb-2 text-sm text-red-200">
            {attachmentError}
          </div>
        )}

        <div
          className="flex items-end gap-2 bg-black/50 rounded-2xl border border-cyan-300/30 p-2 focus-within:ring-2 focus-within:ring-cyan-300/30 focus-within:border-cyan-300 transition-all"
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
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-black/60 border border-cyan-300/30 text-cyan-200/80 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Attach files or generate images"
              aria-haspopup="menu"
              aria-expanded={showAttachmentMenu}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.956 7.956a3.375 3.375 0 01-4.773-4.773l9.348-9.348a2.25 2.25 0 113.182 3.182l-9.349 9.349a1.125 1.125 0 01-1.591-1.591l7.956-7.956" />
              </svg>
            </button>
            {showAttachmentMenu && (
              <div
                ref={attachmentMenuRef}
                className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-slate-200 dark:border-cyan-200/20 bg-white/95 dark:bg-black/90 shadow-lg backdrop-blur"
                role="menu"
              >
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-cyan-100 hover:bg-slate-100 dark:hover:bg-white/5 rounded-t-xl"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    fileInputRef.current?.click();
                  }}
                >
                  Upload file or photo
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-cyan-100 hover:bg-slate-100 dark:hover:bg-white/5 rounded-b-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-cyan-100/40"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    onOpenImageGenerator?.();
                  }}
                  disabled={!canGenerateImages || !onOpenImageGenerator}
                >
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
            className="flex-1 bg-transparent text-base md:text-sm text-cyan-50 placeholder-cyan-200/50 resize-none focus:outline-none px-2 py-2 max-h-[200px]"
          />
          {showStop ? (
            <button
              type="button"
              onClick={onStop}
              disabled={!onStop}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/15 border border-cyan-200/40 flex items-center justify-center text-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              aria-label="Stop generating"
              title="Stop generating (Esc)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="7" y="7" width="10" height="10" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={disabled || (!value.trim() && attachments.length === 0)}
              className="flex-shrink-0 w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-black disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              aria-label="Send message"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
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
        <p className="text-xs text-cyan-200/60 text-center mt-2">
          Press Enter to send, Shift+Enter for new line. Drag & drop or attach files/photos.
        </p>
      </div>
    </div>
  );
}
