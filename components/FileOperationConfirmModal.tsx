"use client";

import { useState } from 'react';
import { useFileAccess } from '@/contexts/FileAccessContext';

interface FileOperationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  operation: 'read' | 'write' | 'list';
  filePath: string;
}

export default function FileOperationConfirmModal({ isOpen, onClose, onConfirm, operation, filePath }: FileOperationConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('File operation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const getOperationDetails = () => {
    switch (operation) {
      case 'read':
        return {
          icon: '📄',
          title: 'Read File',
          description: 'Allow Athena to read the contents of this file'
        };
      case 'write':
        return {
          icon: '✏️',
          title: 'Write File',
          description: 'Allow Athena to modify this file'
        };
      case 'list':
        return {
          icon: '📁',
          title: 'Browse Directory',
          description: 'Allow Athena to list files in this directory'
        };
      default:
        return {
          icon: '📂',
          title: 'File Operation',
          description: 'Allow Athena to perform this file operation'
        };
    }
  };

  const details = getOperationDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-2 border-gold-500/30 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
              {details.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold">{details.title}</h3>
              <p className="text-sm opacity-90">File access request</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
              {details.description}
            </p>
            <div className="bg-surface-100 dark:bg-surface-900 border-2 border-border rounded-lg p-3">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {filePath}
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                💡 Tip: Enable automatic file access in Settings to avoid these confirmation prompts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-surface-50 dark:bg-surface-900 border-t border-border">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-border text-foreground font-semibold hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Deny
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-gold-500 to-amber-500 text-black border-2 border-gold-600 hover:from-gold-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing ? 'Processing...' : 'Allow'}
          </button>
        </div>
      </div>
    </div>
  );
}
