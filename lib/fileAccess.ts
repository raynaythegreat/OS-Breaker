declare global {
  interface Window {
    api?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      getFileAccessStatus: () => Promise<{ enabled: boolean; directories: string[] }>;
      toggleFileAccess: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      listDirectory: (path: string) => Promise<{ success: boolean; files?: any[]; error?: string }>;
      getFileStats: (path: string) => Promise<{ success: boolean; stats?: any; error?: string }>;
      selectDirectory: () => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}

export const FileAccessAPI = {
  getStatus: async () => {
    return window.api?.getFileAccessStatus() ?? { enabled: false, directories: [] };
  },
  
  toggle: async (enabled: boolean) => {
    return window.api?.toggleFileAccess(enabled) ?? { success: false, enabled: false };
  },
  
  readFile: async (path: string) => {
    return window.api?.readFile(path) ?? { success: false, error: 'File access not available' };
  },
  
  writeFile: async (path: string, content: string) => {
    return window.api?.writeFile(path, content) ?? { success: false, error: 'File access not available' };
  },
  
  listDirectory: async (path: string) => {
    return window.api?.listDirectory(path) ?? { success: false, error: 'File access not available' };
  },
  
  getFileStats: async (path: string) => {
    return window.api?.getFileStats(path) ?? { success: false, error: 'File access not available' };
  },

  selectDirectory: async () => {
    return window.api?.selectDirectory() ?? { success: false, error: 'File access not available' };
  }
};
