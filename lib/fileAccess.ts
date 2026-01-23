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
