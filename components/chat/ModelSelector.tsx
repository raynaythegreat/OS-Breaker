"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type ModelProvider =
  | "claude"
  | "openai"
  | "groq"
  | "openrouter"
  | "ollama"
  | "gemini"
  | "fireworks"
  | "mistral"
  | "perplexity"
  | "zai";

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  icon: string;
  description: string;
}

export const MODELS: ModelOption[] = [
  // Claude
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'claude', icon: '🤖', description: 'Most intelligent model' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'claude', icon: '🤖', description: 'Top-tier reasoning' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'claude', icon: '🤖', description: 'Balanced performance' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude', icon: '🤖', description: 'Intelligent & efficient' },
  { id: 'claude-3-5-haiku-20240307', name: 'Claude 3.5 Haiku', provider: 'claude', icon: '🤖', description: 'Fast & lightweight' },

  // OpenAI
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai', icon: '🔮', description: 'Latest multimodal' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai', icon: '🔮', description: 'Latest powerful model' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', icon: '🔮', description: 'Latest multimodal' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', icon: '🔮', description: 'Fast & capable' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', icon: '🔮', description: 'Quick responses' },

  // Groq
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', provider: 'groq', icon: '⚡', description: 'Ultra-fast inference' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', icon: '⚡', description: 'Efficient reasoning' },

  // Gemini
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', provider: 'gemini', icon: '💎', description: 'Ultra-fast experimental' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'gemini', icon: '💎', description: 'Google\'s best' },
  { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', provider: 'gemini', icon: '💎', description: 'Multimodal analysis' },

  // Fireworks
  { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'fireworks', icon: '🎆', description: 'Latest Llama model' },
  { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70B Instruct', provider: 'fireworks', icon: '🎆', description: 'Powerful reasoning' },
  { id: 'accounts/fireworks/models/llama-v3p1-8b-instruct', name: 'Llama 3.1 8B Instruct', provider: 'fireworks', icon: '🎆', description: 'Fast and efficient' },
  { id: 'accounts/fireworks/models/qwen2p5-72b-instruct', name: 'Qwen 2.5 72B Instruct', provider: 'fireworks', icon: '🎆', description: 'Advanced Chinese & English' },

  // Z.ai
  { id: 'glm-4.7', name: 'GLM-4.7', provider: 'zai', icon: '⚡', description: 'Flagship coding model' },
  { id: 'glm-4.6v', name: 'GLM-4.6V', provider: 'zai', icon: '⚡', description: 'Multimodal with vision' },

  // Mistral
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', icon: '🌊', description: 'Top-tier reasoning' },
  { id: 'mistral-medium-latest', name: 'Mistral Medium', provider: 'mistral', icon: '🌊', description: 'Balanced performance' },

  // Perplexity
  { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online', provider: 'perplexity', icon: '🔍', description: 'With web search' },
  { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online', provider: 'perplexity', icon: '🔍', description: 'Fast with search' },
];

interface ModelSelectorProps {
  selectedModel: string;
  selectedProvider: ModelProvider;
  onModelChange: (model: string, provider: ModelProvider) => void;
}

export default function ModelSelector({
  selectedModel,
  selectedProvider,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableProviders, setAvailableProviders] = useState<Set<ModelProvider>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check available API keys on mount and when dropdown opens
  const checkAvailableKeys = useCallback(async () => {
    try {
      const { SecureStorage } = await import('@/lib/secureStorage');
      const keys = await SecureStorage.loadKeys();
      console.log('Raw API keys loaded:', Object.keys(keys));

      const providers: ModelProvider[] = [];
      if (keys.anthropic && keys.anthropic.trim()) providers.push('claude' as ModelProvider);
      if (keys.openai && keys.openai.trim()) providers.push('openai' as ModelProvider);
      if (keys.groq && keys.groq.trim()) providers.push('groq' as ModelProvider);
      if (keys.openrouter && keys.openrouter.trim()) providers.push('openrouter' as ModelProvider);
      if (keys.fireworks && keys.fireworks.trim()) providers.push('fireworks' as ModelProvider);
      if (keys.gemini && keys.gemini.trim()) providers.push('gemini' as ModelProvider);
      if (keys.mistral && keys.mistral.trim()) providers.push('mistral' as ModelProvider);
      if (keys.perplexity && keys.perplexity.trim()) providers.push('perplexity' as ModelProvider);
      if (keys.zai && keys.zai.trim()) providers.push('zai' as ModelProvider);
      // Ollama is always available (local)
      providers.push('ollama' as ModelProvider);

      console.log('Available API key providers:', providers);
      setAvailableProviders(new Set<ModelProvider>(providers));
    } catch (error) {
      console.error('Failed to check available API keys:', error);
      // Fallback to only Ollama when no keys are available
      console.log('Falling back to only Ollama models');
      setAvailableProviders(new Set<ModelProvider>(['ollama']));
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkAvailableKeys();
  }, [checkAvailableKeys]);

  // Re-check when dropdown opens
  useEffect(() => {
    if (isOpen) {
      checkAvailableKeys();
    }
  }, [isOpen, checkAvailableKeys]);

  // Filter models by available providers and search query
  const availableModels = MODELS.filter(model => availableProviders.has(model.provider));

  // Prioritize popular models
  const popularModelIds = ['gpt-5.1', 'gpt-5', 'claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4.5'];
  const popularModels = availableModels.filter(model => popularModelIds.includes(model.id));
  const otherModels = availableModels.filter(model => !popularModelIds.includes(model.id));

  // Combine with popular models first
  const allAvailableModels = [...popularModels, ...otherModels];

  const filteredModels = allAvailableModels.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log('Available models:', availableModels.map(m => `${m.provider}:${m.name}`));
  const selectedOption = availableModels.find(m => m.id === selectedModel) || availableModels[0] || MODELS[0];

  // Group models by provider
  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelOption[]>);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 hover:bg-white dark:hover:bg-surface-800 hover:border-gold-500/50 transition-all shadow-sm group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg group-hover:scale-110 transition-transform">{selectedOption.icon}</span>
          <span className="hidden sm:inline text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{selectedOption.name}</span>
        </div>
        <svg
          className={`w-4 h-4 text-surface-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-surface-200 dark:border-surface-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-foreground border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {Object.entries(groupedModels).map(([provider, models]) => (
              <div key={provider} className="mb-3">
                 <div className="px-3 py-1 text-[10px] font-black text-surface-600 dark:text-foreground/60 uppercase tracking-widest">
                   {provider}
                 </div>
                <div className="space-y-1">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id, model.provider);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                        model.id === selectedModel
                          ? 'bg-gold-500/10 dark:bg-accent border-2 border-gold-500 shadow-md'
                          : 'hover:bg-surface-100 dark:hover:bg-accent border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{model.icon}</span>
                        <div className="flex-1 min-w-0">
                           <div className={`font-bold text-sm truncate ${
                             model.id === selectedModel
                               ? 'text-surface-900 dark:text-foreground'
                               : 'text-surface-900 dark:text-foreground'
                           }`}>
                             {model.name}
                           </div>
                           <div className={`text-[10px] truncate ${
                             model.id === selectedModel
                               ? 'text-surface-700 dark:text-foreground/80'
                               : 'text-surface-600 dark:text-foreground/60'
                           }`}>
                             {model.description}
                           </div>
                        </div>
                      </div>
                      {model.id === selectedModel && (
                        <div className="w-2 h-2 rounded-full bg-gold-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

             {filteredModels.length === 0 && (
               <div className="text-center py-8 px-4">
                 <div className="text-surface-600 dark:text-foreground/60 text-sm mb-2">
                   No models available
                 </div>
                 <div className="text-surface-500 dark:text-foreground/50 text-xs">
                   Configure API keys in Settings to access AI models
                 </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
