"use client";

import { useState, useRef, useEffect } from "react";

export type ModelProvider =
  | "claude"
  | "openai"
  | "groq"
  | "openrouter"
  | "ollama"
  | "gemini"
  | "fireworks"
  | "mistral"
  | "cohere"
  | "perplexity";

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

  // Mistral
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', icon: '🌊', description: 'Top-tier reasoning' },
  { id: 'mistral-medium-latest', name: 'Mistral Medium', provider: 'mistral', icon: '🌊', description: 'Balanced performance' },

  // Cohere
  { id: 'command-r-plus', name: 'Command R+', provider: 'cohere', icon: '🧠', description: 'Advanced RAG' },
  { id: 'command-r', name: 'Command R', provider: 'cohere', icon: '🧠', description: 'Efficient commands' },

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  const filteredModels = MODELS.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground border-2 border-border rounded-lg text-sm font-bold hover:border-gold-500 transition-all"
      >
        <span className="text-lg">{selectedOption.icon}</span>
        <span className="hidden sm:inline">{selectedOption.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-card border-2 border-border rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b-2 border-border">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-full px-3 py-2 bg-background text-foreground border-2 border-border rounded-lg text-sm focus:outline-none focus:border-gold-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {Object.entries(groupedModels).map(([provider, models]) => (
              <div key={provider} className="mb-3">
                <div className="px-3 py-1 text-[10px] font-black text-foreground/40 dark:text-muted-foreground uppercase tracking-widest">
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
                          ? 'bg-gold-500 border-2 border-gold-600 shadow-md'
                          : 'hover:bg-secondary border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{model.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm truncate ${
                            model.id === selectedModel
                              ? 'text-white'
                              : 'text-foreground'
                          }`}>
                            {model.name}
                          </div>
                          <div className={`text-[10px] truncate ${
                            model.id === selectedModel
                              ? 'text-white/90'
                              : 'text-muted-foreground'
                          }`}>
                            {model.description}
                          </div>
                        </div>
                      </div>
                      {model.id === selectedModel && (
                        <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredModels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No models found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
