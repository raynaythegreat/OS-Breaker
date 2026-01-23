"use client";

export interface ApiKeys {
  anthropic: string;
  openai: string;
  groq: string;
  openrouter: string;
  fireworks: string;
  gemini: string;
  mistral: string;
  cohere: string;
  perplexity: string;
  github: string;
  vercel: string;
  render: string;
  ollamaBaseUrl: string;
}

const API_KEY_MAP = {
  anthropic: 'CLAUDE_API_KEY',
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  gemini: 'GEMINI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  cohere: 'COHERE_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  github: 'GITHUB_TOKEN',
  vercel: 'VERCEL_TOKEN',
  render: 'RENDER_API_KEY',
  ollamaBaseUrl: 'OLLAMA_BASE_URL',
} as const;

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).apiKeys;

// Electron storage functions
async function electronGetKeys(): Promise<Partial<ApiKeys>> {
  try {
    const result = await (window as any).apiKeys.get();
    if (!result.success || !result.keys) return {};
    
    const mappedKeys: Partial<ApiKeys> = {};
    Object.entries(API_KEY_MAP).forEach(([key, envKey]) => {
      if (result.keys[envKey]) {
        mappedKeys[key as keyof ApiKeys] = result.keys[envKey];
      }
    });
    
    return mappedKeys;
  } catch (error) {
    console.error('Failed to load API keys from Electron storage:', error);
    return {};
  }
}

async function electronSaveKeys(keys: Partial<ApiKeys>): Promise<boolean> {
  try {
    const envKeys: Record<string, string> = {};
    Object.entries(keys).forEach(([key, value]) => {
      if (value) {
        const envKey = API_KEY_MAP[key as keyof ApiKeys];
        envKeys[envKey] = value;
      }
    });
    
    await (window as any).apiKeys.set(envKeys);
    console.log('Successfully saved API keys to secure Electron storage');
    return true;
  } catch (error) {
    console.error('Failed to save API keys to Electron storage:', error);
    return false;
  }
}

async function electronDeleteKey(keyName: keyof ApiKeys): Promise<boolean> {
  try {
    const envKey = API_KEY_MAP[keyName];
    await (window as any).apiKeys.delete([envKey]);
    console.log(`Successfully deleted ${keyName} from secure Electron storage`);
    return true;
  } catch (error) {
    console.error(`Failed to delete ${keyName} from Electron storage:`, error);
    return false;
  }
}

// LocalStorage fallback functions
async function localStorageLoadKeys(): Promise<Partial<ApiKeys>> {
  try {
    const stored = localStorage.getItem('api-keys');
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  } catch (error) {
    console.error('Failed to load API keys from localStorage:', error);
    return {};
  }
}

async function localStorageSaveKeys(keys: Partial<ApiKeys>): Promise<boolean> {
  try {
    localStorage.setItem('api-keys', JSON.stringify(keys));
    console.log('Successfully saved API keys to localStorage');
    return true;
  } catch (error) {
    console.error('Failed to save API keys to localStorage:', error);
    return false;
  }
}

async function localStorageDeleteKey(keyName: keyof ApiKeys): Promise<boolean> {
  try {
    const current = await localStorageLoadKeys();
    delete current[keyName];
    localStorage.setItem('api-keys', JSON.stringify(current));
    return true;
  } catch (error) {
    console.error('Failed to delete key from localStorage:', error);
    return false;
  }
}

// Main storage class
export class SecureStorage {
  static async loadKeys(): Promise<Partial<ApiKeys>> {
    if (isElectron) {
      return await electronGetKeys();
    } else {
      return await localStorageLoadKeys();
    }
  }

  static async saveKeys(keys: Partial<ApiKeys>): Promise<boolean> {
    if (isElectron) {
      return await electronSaveKeys(keys);
    } else {
      return await localStorageSaveKeys(keys);
    }
  }

  static async deleteKey(keyName: keyof ApiKeys): Promise<boolean> {
    if (isElectron) {
      return await electronDeleteKey(keyName);
    } else {
      return await localStorageDeleteKey(keyName);
    }
  }

  static async getKey(keyName: keyof ApiKeys): Promise<string> {
    const keys = await this.loadKeys();
    return keys[keyName] || '';
  }

  static isElectronStorage(): boolean {
    return isElectron;
  }

  static async getStatus(): Promise<Partial<Record<keyof ApiKeys, boolean>>> {
    const keys = await this.loadKeys();
    const status: Partial<Record<keyof ApiKeys, boolean>> = {};
    
    Object.entries(keys).forEach(([key, value]) => {
      if (value && value.trim()) {
        status[key as keyof ApiKeys] = true;
      }
    });
    
    return status;
  }
}