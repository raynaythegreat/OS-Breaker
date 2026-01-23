declare global {
  interface Window {
    electronAPI?: {
      encryptValue: (value: string) => Promise<string>;
      decryptValue: (encryptedValue: string) => Promise<string>;
      createDesktopEntry: () => Promise<{ success: boolean; error?: string }>;
      getAppVersion: () => Promise<string>;
      getAppPath: (name: string) => Promise<string>;
      onMessage: (callback: (event: any, ...args: any[]) => void) => void;
      sendMessage: (channel: string, data: any) => void;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
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
      apiKeys: {
        get: () => Promise<{ success: boolean; keys?: Record<string, string>; error?: string }>;
        set: (keys: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
        delete: (keyNames: string[]) => Promise<{ success: boolean; error?: string }>;
        getStatus: () => Promise<{ success: boolean; status?: Record<string, boolean>; error?: string }>;
      };
    };
  }
}

export {};
