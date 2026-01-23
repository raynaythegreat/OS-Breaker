"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FileAccessAPI } from '@/lib/fileAccess';

interface FileAccessContextType {
  enabled: boolean;
  directories: string[];
  toggleAccess: (enabled: boolean) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  listDirectory: (path: string) => Promise<any[]>;
  getFileStats: (path: string) => Promise<any>;
  selectDirectory: () => Promise<string | null>;
  refreshStatus: () => Promise<void>;
}

const FileAccessContext = createContext<FileAccessContextType | undefined>(undefined);

export function FileAccessProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [directories, setDirectories] = useState<string[]>([]);

  const refreshStatus = async () => {
    try {
      const status = await FileAccessAPI.getStatus();
      setEnabled(status.enabled);
      setDirectories(status.directories);
    } catch (error) {
      console.error('Failed to get file access status:', error);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const toggleAccess = async (newEnabled: boolean) => {
    try {
      await FileAccessAPI.toggle(newEnabled);
      setEnabled(newEnabled);
    } catch (error) {
      console.error('Failed to toggle file access:', error);
    }
  };

  const readFile = async (path: string) => {
    const result = await FileAccessAPI.readFile(path);
    if (!result.success || result.error) {
      throw new Error(result.error || 'Failed to read file');
    }
    return (result as any).content || '';
  };

  const writeFile = async (path: string, content: string) => {
    const result = await FileAccessAPI.writeFile(path, content);
    if (!result.success || result.error) {
      throw new Error(result.error || 'Failed to write file');
    }
    return true;
  };

  const listDirectory = async (path: string) => {
    const result = await FileAccessAPI.listDirectory(path);
    if (!result.success || result.error) {
      throw new Error(result.error || 'Failed to list directory');
    }
    return (result as any).files || [];
  };

  const getFileStats = async (path: string) => {
    const result = await FileAccessAPI.getFileStats(path);
    if (!result.success || result.error) {
      throw new Error(result.error || 'Failed to get file stats');
    }
    return (result as any).stats || {};
  };

  const selectDirectory = async () => {
    const result = await FileAccessAPI.selectDirectory();
    if (!result.success || result.error) {
      throw new Error(result.error || 'Failed to select directory');
    }
    return (result as any).path || null;
  };

  return (
    <FileAccessContext.Provider value={{
      enabled,
      directories,
      toggleAccess,
      readFile,
      writeFile,
      listDirectory,
      getFileStats,
      selectDirectory,
      refreshStatus
    }}>
      {children}
    </FileAccessContext.Provider>
  );
}

export function useFileAccess() {
  const context = useContext(FileAccessContext);
  if (!context) {
    throw new Error('useFileAccess must be used within FileAccessProvider');
  }
  return context;
}
