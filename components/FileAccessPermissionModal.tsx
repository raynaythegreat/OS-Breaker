"use client";

import { useState } from 'react';
import { useFileAccess } from '@/contexts/FileAccessContext';

interface FileAccessPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedAction: 'enable' | 'disable';
}

export default function FileAccessPermissionModal({ isOpen, onClose, requestedAction }: FileAccessPermissionModalProps) {
  const { toggleAccess } = useFileAccess();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await toggleAccess(requestedAction === 'enable');
      onClose();
    } catch (error) {
      console.error('Failed to toggle file access:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-2 border-gold-500/30 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">Security Warning</h3>
              <p className="text-sm opacity-90">File system access requested</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {requestedAction === 'enable' ? (
            <>
              <p className="text-sm text-foreground leading-relaxed">
                You are about to <strong>grant OS Athena access to your file system</strong>. This will allow the AI to:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-gold-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Read files from your entire home directory</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-gold-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Edit and modify files</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-gold-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Create new files</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-gold-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span>List and browse directories</span>
                </li>
              </ul>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Only grant this permission if you trust the AI suggestions. You can revoke access at any time from Settings. When enabled, file operations will be automatic.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed">
                Disabling file access will prevent the AI from reading or editing your files until you re-enable it.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  ℹ️ Existing files will remain unchanged. This only affects future operations.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-4 bg-surface-50 dark:bg-surface-900 border-t border-border">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-border text-foreground font-semibold hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            No, Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold border-2 transition-colors ${
              requestedAction === 'enable'
                ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black border-gold-600 hover:from-gold-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'bg-surface-200 dark:bg-surface-800 text-foreground border-border hover:bg-surface-300 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Processing...' : requestedAction === 'enable' ? 'Yes, Enable Access' : 'Yes, Disable'}
          </button>
        </div>
      </div>
    </div>
  );
}
